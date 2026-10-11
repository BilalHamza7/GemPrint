"""Repeatable 30 × 30 biometric evaluation for GemPrint.

This runner reuses the production CLAHE, SIFT, FLANN and RANSAC functions.
It performs no HTTP calls and no alternative matching, so cloud latency and
Render service limits cannot influence the research measurements.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import statistics
import sys
import time
from pathlib import Path
from typing import Any

CV_SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CV_SERVICE_ROOT))

from app.main import (  # noqa: E402
    ALGORITHM_VERSION,
    MINIMUM_INLIERS,
    MINIMUM_INLIER_RATIO,
    compare_features,
    extract_features_with_timings,
    quality_score,
)

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
FULL_IMAGE_FRAME = {'x': 0.0, 'y': 0.0, 'width': 1.0, 'height': 1.0}
NUMBER_PATTERN = re.compile(r'(\d+)$')


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Evaluate the GemPrint production fingerprint pipeline.')
    parser.add_argument('--enrolment-dir', type=Path, required=True)
    parser.add_argument('--verification-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument(
        '--frames-json',
        type=Path,
        help='Optional JSON mapping of relative image path to a browser-confirmed x/y/width/height frame.',
    )
    parser.add_argument('--no-charts', action='store_true')
    return parser.parse_args()


def image_number(path: Path) -> int:
    match = NUMBER_PATTERN.search(path.stem)
    if not match:
        raise ValueError(f'Image name must end with its numeric identifier: {path.name}')
    return int(match.group(1))


def image_files(directory: Path) -> list[Path]:
    files = sorted(path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
    if not files:
        raise ValueError(f'No JPEG or PNG images found in {directory}')
    return files


def number_index(paths: list[Path], label: str) -> dict[int, Path]:
    indexed: dict[int, Path] = {}
    for path in paths:
        identifier = image_number(path)
        if identifier in indexed:
            raise ValueError(f'Duplicate numeric identifier {identifier:02d} in {label}')
        indexed[identifier] = path
    return indexed


def load_frames(path: Path | None, enrolment_dir: Path, verification_dir: Path) -> dict[str, dict[str, float]]:
    if path is None:
        return {}
    values = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(values, dict):
        raise ValueError('--frames-json must contain an object keyed by relative image path.')
    frames: dict[str, dict[str, float]] = {}
    for image_path, frame in values.items():
        if not isinstance(image_path, str) or not isinstance(frame, dict):
            raise ValueError('Every frame entry must map an image path to a frame object.')
        frames[image_path] = {key: float(frame[key]) for key in ('x', 'y', 'width', 'height')}
    return frames


def frame_for(path: Path, enrolment_dir: Path, verification_dir: Path, frames: dict[str, dict[str, float]]) -> dict[str, float]:
    if path.is_relative_to(enrolment_dir):
        relative = f'enrolment/{path.relative_to(enrolment_dir).as_posix()}'
    else:
        relative = f'verification/{path.relative_to(verification_dir).as_posix()}'
    return frames.get(relative, FULL_IMAGE_FRAME)


def extract(path: Path, frame: dict[str, float]) -> dict[str, Any]:
    started = time.perf_counter()
    roi, keypoints, descriptors, metadata, timings = extract_features_with_timings(path.read_bytes(), frame)
    return {
        'path': path,
        'keypoints': keypoints,
        'descriptors': descriptors,
        'keypoint_count': len(keypoints),
        'quality_score': quality_score(len(keypoints)),
        'roi_metadata': metadata,
        'preprocessing_ms': timings['preprocessing_ms'],
        'feature_extraction_ms': timings['feature_extraction_ms'],
        'total_extraction_ms': round((time.perf_counter() - started) * 1000, 4),
    }


def rates(rows: list[dict[str, Any]], threshold: float) -> dict[str, float | int]:
    genuine = [row for row in rows if row['comparison_type'] == 'genuine']
    impostor = [row for row in rows if row['comparison_type'] == 'impostor']

    def accepted(row: dict[str, Any]) -> bool:
        return row['inlier_count'] >= MINIMUM_INLIERS and row['inlier_ratio'] >= threshold

    true_accepts = sum(accepted(row) for row in genuine)
    false_rejections = len(genuine) - true_accepts
    false_accepts = sum(accepted(row) for row in impostor)
    true_rejects = len(impostor) - false_accepts
    total = len(rows)
    return {
        'threshold': round(threshold, 4),
        'genuine_attempts': len(genuine),
        'impostor_attempts': len(impostor),
        'true_accepts': true_accepts,
        'false_rejections': false_rejections,
        'false_accepts': false_accepts,
        'true_rejects': true_rejects,
        'far_percent': round((false_accepts / len(impostor) * 100) if impostor else 0, 4),
        'frr_percent': round((false_rejections / len(genuine) * 100) if genuine else 0, 4),
        'accuracy_percent': round(((true_accepts + true_rejects) / total * 100) if total else 0, 4),
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def write_charts(output_dir: Path, threshold_rows: list[dict[str, Any]]) -> None:
    try:
        import matplotlib.pyplot as plot
    except ImportError:
        print('Charts skipped: install matplotlib to generate them.')
        return
    thresholds = [row['threshold'] for row in threshold_rows]
    far = [row['far_percent'] for row in threshold_rows]
    frr = [row['frr_percent'] for row in threshold_rows]
    figure, axis = plot.subplots(figsize=(8, 5))
    axis.plot(thresholds, far, label='FAR / FMR')
    axis.plot(thresholds, frr, label='FRR / FNMR')
    axis.set(xlabel='Inlier-ratio threshold (τ)', ylabel='Rate (%)', title='GemPrint threshold sweep')
    axis.grid(alpha=0.25)
    axis.legend()
    figure.tight_layout()
    figure.savefig(output_dir / 'far_frr_threshold_sweep.png', dpi=180)
    plot.close(figure)


def main() -> None:
    arguments = parse_arguments()
    enrolment_dir = arguments.enrolment_dir.resolve()
    verification_dir = arguments.verification_dir.resolve()
    output_dir = arguments.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    frames = load_frames(arguments.frames_json, enrolment_dir, verification_dir)

    baseline_paths = number_index(image_files(enrolment_dir), 'enrolment')
    query_groups = {
        group: number_index(image_files(verification_dir / group), group)
        for group in ('rotation', 'glare', 'crop')
    }
    query_paths = {number: (group, path) for group, paths in query_groups.items() for number, path in paths.items()}

    if len(baseline_paths) != 30 or len(query_paths) != 30:
        raise ValueError(f'Expected 30 enrolment and 30 verification images; found {len(baseline_paths)} and {len(query_paths)}.')
    if set(baseline_paths) != set(query_paths):
        raise ValueError('Baseline and query numeric identifiers must match exactly (01 through 30).')

    print('Extracting 30 enrolled fingerprints once…')
    baselines = {
        number: extract(path, frame_for(path, enrolment_dir, verification_dir, frames))
        for number, path in sorted(baseline_paths.items())
    }
    print('Extracting 30 verification fingerprints once…')
    queries = {
        number: {
            **extract(path, frame_for(path, enrolment_dir, verification_dir, frames)),
            'variation_group': group,
        }
        for number, (group, path) in sorted(query_paths.items())
    }

    rows: list[dict[str, Any]] = []
    for query_number, query in queries.items():
        for baseline_number, baseline in baselines.items():
            comparison, _, _ = compare_features(
                query['keypoints'], query['descriptors'], baseline['keypoints'], baseline['descriptors']
            )
            is_genuine = query_number == baseline_number
            rows.append(
                {
                    'query_file': query['path'].name,
                    'baseline_file': baseline['path'].name,
                    'variation_group': query['variation_group'],
                    'comparison_type': 'genuine' if is_genuine else 'impostor',
                    'expected_match': is_genuine,
                    'production_verdict': comparison['verdict'],
                    'good_match_count': comparison['good_match_count'],
                    'inlier_count': comparison['inlier_count'],
                    'inlier_ratio': comparison['inlier_ratio'],
                    'confidence_score': comparison['confidence_score'],
                    'query_keypoint_count': query['keypoint_count'],
                    'baseline_keypoint_count': baseline['keypoint_count'],
                    'query_quality_score': query['quality_score'],
                    'baseline_quality_score': baseline['quality_score'],
                    'query_preprocessing_ms': query['preprocessing_ms'],
                    'query_feature_extraction_ms': query['feature_extraction_ms'],
                    'matching_ms': comparison['matching_ms'],
                    'estimated_verification_ms': round(
                        query['preprocessing_ms'] + query['feature_extraction_ms'] + comparison['matching_ms'], 4
                    ),
                    'baseline_enrolment_ms': baseline['total_extraction_ms'],
                }
            )

    threshold_rows = [rates(rows, step / 100) for step in range(101)]
    current = rates(rows, MINIMUM_INLIER_RATIO)
    eer = min(threshold_rows, key=lambda row: abs(row['far_percent'] - row['frr_percent']))
    best_accuracy = max(threshold_rows, key=lambda row: row['accuracy_percent'])
    group_metrics = {
        group: rates([row for row in rows if row['variation_group'] == group], MINIMUM_INLIER_RATIO)
        for group in query_groups
    }
    verification_latencies = [row['estimated_verification_ms'] for row in rows]
    summary = {
        'algorithm_version': ALGORITHM_VERSION,
        'dataset': {'enrolment_images': len(baselines), 'verification_images': len(queries), 'comparisons': len(rows)},
        'production_decision_rule': {
            'minimum_inliers': MINIMUM_INLIERS,
            'inlier_ratio_threshold': MINIMUM_INLIER_RATIO,
        },
        'current_threshold_metrics': current,
        'eer_estimate': eer,
        'highest_accuracy_threshold': best_accuracy,
        'variation_group_metrics': group_metrics,
        'latency_ms': {
            'mean_estimated_verification': round(statistics.mean(verification_latencies), 4),
            'median_estimated_verification': round(statistics.median(verification_latencies), 4),
            'mean_baseline_enrolment': round(statistics.mean(item['total_extraction_ms'] for item in baselines.values()), 4),
        },
        'notes': [
            'Each baseline and query is extracted once, then all 900 FLANN/RANSAC comparisons are executed.',
            'No alternative matching method is added by this evaluator.',
            'Without --frames-json, the full source image is standardized to the production 1280 × 960 ROI.',
        ],
    }
    write_csv(output_dir / 'comparison_results.csv', rows)
    write_csv(output_dir / 'threshold_metrics.csv', threshold_rows)
    (output_dir / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    (output_dir / 'summary.md').write_text(
        '\n'.join(
            [
                '# GemPrint Evaluation Summary',
                '',
                f"- Comparisons: {len(rows)} (30 genuine, 870 impostor)",
                f"- Current threshold: {MINIMUM_INLIER_RATIO:.2f}",
                f"- FAR: {current['far_percent']}%", f"- FRR: {current['frr_percent']}%",
                f"- Accuracy: {current['accuracy_percent']}%",
                f"- Estimated EER: {max(eer['far_percent'], eer['frr_percent'])}% at τ={eer['threshold']}",
            ]
        ),
        encoding='utf-8',
    )
    if not arguments.no_charts:
        write_charts(output_dir, threshold_rows)
    print(f'Completed {len(rows)} comparisons. Results saved to {output_dir}')


if __name__ == '__main__':
    main()
