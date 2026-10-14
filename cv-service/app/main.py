import base64
import hashlib
import io
import json
import math
import time

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status

from .core.config import INTERNAL_SERVICE_KEY

ALGORITHM_VERSION = 'sift-clahe-v1'
MINIMUM_KEYPOINTS = 10
MINIMUM_INLIERS = 10
MINIMUM_INLIER_RATIO = 0.5
OPENCV_RANDOM_SEED = 42
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_PROCESSING_DIMENSION = 2048
ROI_WIDTH = 1280
ROI_HEIGHT = 960
ROI_ASPECT_RATIO = ROI_WIDTH / ROI_HEIGHT
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID = (8, 8)
SIFT_NFEATURES = 1500
SIFT_CONTRAST_THRESHOLD = 0.03
SIFT_EDGE_THRESHOLD = 10
FLANN_TREES = 5
FLANN_CHECKS = 50
LOWE_RATIO = 0.75
RANSAC_REPROJECTION_THRESHOLD = 5.0

# A single worker/thread avoids OpenCV allocating extra working memory on Render's 512 MB service.
cv2.setNumThreads(1)

app = FastAPI(title='GemPrint CV Engine', version='0.1.0', docs_url=None, redoc_url=None)


def require_internal_key(x_internal_service_key: str | None = Header(default=None)) -> None:
    if not INTERNAL_SERVICE_KEY or x_internal_service_key != INTERNAL_SERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Internal service authentication failed')


def decode_image(raw: bytes, mode: int = cv2.IMREAD_GRAYSCALE) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), mode)
    if image is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unreadable image.')
    height, width = image.shape[:2]
    largest_dimension = max(height, width)
    if largest_dimension <= MAX_PROCESSING_DIMENSION:
        return image
    scale = MAX_PROCESSING_DIMENSION / largest_dimension
    return cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)


async def read_image_upload(upload: UploadFile) -> bytes:
    raw = await upload.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail='Image exceeds the 8 MB upload limit.')
    return raw


def preprocess(image: np.ndarray) -> np.ndarray:
    return cv2.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT,
        tileGridSize=CLAHE_TILE_GRID,
    ).apply(image)


def parse_frame(frame_json: str) -> dict[str, float]:
    """Validate the browser-confirmed fixed-frame transform.

    Framing standardises the user's microscopic input. It does not perform
    segmentation or feature enhancement; CLAHE remains the first processing
    operation applied to the selected ROI.
    """
    try:
        frame = json.loads(frame_json)
        x = float(frame['x'])
        y = float(frame['y'])
        width = float(frame['width'])
        height = float(frame['height'])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid microscopic image frame.') from error

    if (
        not all(math.isfinite(value) for value in [x, y, width, height])
        or x < 0
        or y < 0
        or width <= 0
        or height <= 0
        or x + width > 1.001
        or y + height > 1.001
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Microscopic image frame is invalid.')
    return {'x': x, 'y': y, 'width': width, 'height': height}


def standardize_roi(image: np.ndarray, frame: dict[str, float]) -> tuple[np.ndarray, dict[str, float | int]]:
    """Recreate the fixed 4:3 browser viewport and resize it to 1280 × 960."""
    height, width = image.shape[:2]
    crop_width_int = max(1, int(round(frame['width'] * width)))
    crop_height_int = max(1, int(round(frame['height'] * height)))
    x = min(max(int(round(frame['x'] * width)), 0), width - crop_width_int)
    y = min(max(int(round(frame['y'] * height)), 0), height - crop_height_int)
    cropped = image[y:y + crop_height_int, x:x + crop_width_int]
    roi = cv2.resize(cropped, (ROI_WIDTH, ROI_HEIGHT), interpolation=cv2.INTER_AREA)
    return roi, {
        'source_width': width,
        'source_height': height,
        'crop_x': x,
        'crop_y': y,
        'crop_width': crop_width_int,
        'crop_height': crop_height_int,
        'roi_width': ROI_WIDTH,
        'roi_height': ROI_HEIGHT,
        'frame_x': frame['x'],
        'frame_y': frame['y'],
        'frame_width': frame['width'],
        'frame_height': frame['height'],
    }


def extract_features(raw: bytes, frame: dict[str, float]) -> tuple[np.ndarray, list[cv2.KeyPoint], np.ndarray | None, dict[str, float | int]]:
    roi, keypoints, descriptors, roi_metadata, _ = extract_features_with_timings(raw, frame)
    return roi, keypoints, descriptors, roi_metadata


def extract_features_with_timings(
    raw: bytes, frame: dict[str, float]
) -> tuple[np.ndarray, list[cv2.KeyPoint], np.ndarray | None, dict[str, float | int], dict[str, float]]:
    """Run the production extraction steps and expose stage timings for offline evaluation."""
    image = decode_image(raw)
    roi, roi_metadata = standardize_roi(image, frame)
    preprocessing_started = time.perf_counter()
    normalized = preprocess(roi)
    preprocessing_ms = (time.perf_counter() - preprocessing_started) * 1000
    feature_extraction_started = time.perf_counter()
    keypoints, descriptors = cv2.SIFT_create(
        nfeatures=SIFT_NFEATURES,
        contrastThreshold=SIFT_CONTRAST_THRESHOLD,
        edgeThreshold=SIFT_EDGE_THRESHOLD,
    ).detectAndCompute(normalized, None)
    feature_extraction_ms = (time.perf_counter() - feature_extraction_started) * 1000
    return roi, keypoints, descriptors, roi_metadata, {
        'preprocessing_ms': round(preprocessing_ms, 4),
        'feature_extraction_ms': round(feature_extraction_ms, 4),
    }


def compare_features(
    query_keypoints: list[cv2.KeyPoint],
    query_descriptors: np.ndarray | None,
    reference_keypoints: list[cv2.KeyPoint],
    reference_descriptors: np.ndarray | None,
) -> tuple[dict[str, float | int | str], list[cv2.DMatch], np.ndarray | None]:
    """Apply the production FLANN and RANSAC decision rule without changing it."""
    matching_started = time.perf_counter()

    # FLANN and RANSAC can use OpenCV's internal random generator. Reset it for
    # each comparison so an identical pair produces an identical decision; this
    # matches the reproducible 900-comparison evaluation protocol.
    cv2.setRNGSeed(OPENCV_RANDOM_SEED)

    if (
        query_descriptors is None
        or reference_descriptors is None
        or len(query_descriptors) < MINIMUM_KEYPOINTS
        or len(reference_descriptors) < MINIMUM_KEYPOINTS
        or len(query_keypoints) < MINIMUM_KEYPOINTS
        or len(reference_keypoints) < MINIMUM_KEYPOINTS
    ):
        return (
            {
                'verdict': 'inconclusive',
                'reason': 'Insufficient visible features for a reliable comparison.',
                'good_match_count': 0,
                'inlier_count': 0,
                'inlier_ratio': 0.0,
                'confidence_score': 0.0,
                'matching_ms': round((time.perf_counter() - matching_started) * 1000, 4),
            },
            [],
            None,
        )

    matcher = cv2.FlannBasedMatcher(
        dict(algorithm=1, trees=FLANN_TREES),
        dict(checks=FLANN_CHECKS),
    )

    try:
        candidate_pairs = matcher.knnMatch(
            query_descriptors,
            reference_descriptors,
            k=2,
        )
    except cv2.error:
        candidate_pairs = []

    good_matches = [
        pair[0]
        for pair in candidate_pairs
        if len(pair) == 2 and pair[0].distance < LOWE_RATIO * pair[1].distance
    ]
    inlier_mask: np.ndarray | None = None
    inliers = 0
    if len(good_matches) >= MINIMUM_INLIERS:
        source = np.float32([query_keypoints[match.queryIdx].pt for match in good_matches]).reshape(-1, 1, 2)
        destination = np.float32([reference_keypoints[match.trainIdx].pt for match in good_matches]).reshape(-1, 1, 2)
        try:
            _, inlier_mask = cv2.findHomography(
                source,
                destination,
                cv2.RANSAC,
                RANSAC_REPROJECTION_THRESHOLD,
            )
            inliers = int(inlier_mask.sum()) if inlier_mask is not None else 0
        except cv2.error:
            # A geometrically degenerate set of correspondences is not a
            # service failure. It is evidence that this query cannot verify
            # the enrolled microscopic fingerprint.
            inlier_mask = None
            inliers = 0

    ratio = inliers / len(good_matches) if good_matches else 0
    verified = (
        inliers >= MINIMUM_INLIERS
        and ratio >= MINIMUM_INLIER_RATIO
    )

    return (
        {
            'verdict': 'verified' if verified else 'not_verified',
            'reason': (
                None
                if verified
                else 'The image did not contain enough geometrically consistent features to verify this gemstone.'
            ),
            'good_match_count': len(good_matches),
            'inlier_count': inliers,
            'inlier_ratio': round(ratio, 4),
            'confidence_score': round(ratio * 100, 2),
            'matching_ms': round((time.perf_counter() - matching_started) * 1000, 4),
        },
        good_matches,
        inlier_mask,
    )


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def metadata_for(keypoints: list[cv2.KeyPoint]) -> list[dict[str, float | int]]:
    return [
        {
            'x': round(point.pt[0], 3),
            'y': round(point.pt[1], 3),
            'size': round(point.size, 3),
            'angle': round(point.angle, 3),
            'response': round(point.response, 6),
            'octave': point.octave,
        }
        for point in keypoints
    ]


def quality_score(keypoint_count: int) -> float:
    return round(min(100, keypoint_count / 5), 2)


def pipeline_metadata() -> dict[str, float | int | list[int]]:
    """Expose the fixed production parameters alongside service responses."""
    return {
        'opencv_random_seed': OPENCV_RANDOM_SEED,
        'clahe_clip_limit': CLAHE_CLIP_LIMIT,
        'clahe_tile_grid': list(CLAHE_TILE_GRID),
        'sift_nfeatures': SIFT_NFEATURES,
        'sift_contrast_threshold': SIFT_CONTRAST_THRESHOLD,
        'sift_edge_threshold': SIFT_EDGE_THRESHOLD,
        'flann_trees': FLANN_TREES,
        'flann_checks': FLANN_CHECKS,
        'lowe_ratio': LOWE_RATIO,
        'ransac_reprojection_threshold': RANSAC_REPROJECTION_THRESHOLD,
        'minimum_keypoints': MINIMUM_KEYPOINTS,
        'minimum_inliers': MINIMUM_INLIERS,
        'inlier_ratio_threshold': MINIMUM_INLIER_RATIO,
        'standard_roi_width': ROI_WIDTH,
        'standard_roi_height': ROI_HEIGHT,
    }


def serialize_descriptors(descriptors: np.ndarray | None) -> str:
    stream = io.BytesIO()
    np.save(stream, descriptors if descriptors is not None else np.empty((0, 128), dtype=np.float32), allow_pickle=False)
    return base64.b64encode(stream.getvalue()).decode('ascii')


def serialize_png(image: np.ndarray) -> str:
    ok, encoded = cv2.imencode('.png', image)
    if not ok:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Could not encode the standard fingerprint region.')
    return base64.b64encode(encoded.tobytes()).decode('ascii')


def load_descriptors(raw: bytes) -> np.ndarray:
    try:
        descriptors = np.load(io.BytesIO(raw), allow_pickle=False)
    except (ValueError, OSError) as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unreadable enrolled descriptor artifact.') from error
    if descriptors.ndim != 2 or descriptors.shape[1] != 128:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid enrolled descriptor artifact.')
    return descriptors.astype(np.float32)


def restore_keypoints(value: str) -> list[cv2.KeyPoint]:
    try:
        metadata = json.loads(value)
        if not isinstance(metadata, list):
            raise ValueError('Keypoint metadata must be an array.')
        return [
            cv2.KeyPoint(
                float(point['x']),
                float(point['y']),
                float(point['size']),
                float(point.get('angle', -1)),
                float(point.get('response', 0)),
                int(point.get('octave', 0)),
            )
            for point in metadata
        ]
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid enrolled keypoint metadata.') from error


def match_proof(
    query_image: np.ndarray,
    query_keypoints: list[cv2.KeyPoint],
    reference_image: np.ndarray,
    reference_keypoints: list[cv2.KeyPoint],
    matches: list[cv2.DMatch],
    inlier_mask: np.ndarray | None,
) -> str | None:
    """Create optional visual evidence without changing a verification decision.

    A valid comparison must still be returned if OpenCV cannot render an image
    for a particular correspondence geometry. The evidence image is useful to
    the user, but it must never turn a completed verification into an API error.
    """
    try:
        drawing = cv2.drawMatches(
            query_image,
            query_keypoints,
            reference_image,
            reference_keypoints,
            matches,
            None,
            matchesMask=inlier_mask.ravel().tolist() if inlier_mask is not None else None,
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
        )
        ok, encoded = cv2.imencode('.png', drawing)
        if not ok:
            return None
        return base64.b64encode(encoded.tobytes()).decode('ascii')
    except cv2.error:
        return None


@app.get('/health')
def health() -> dict:
    return {
        'status': 'ok',
        'service': 'gemprint-cv-engine',
        'algorithm_version': ALGORITHM_VERSION,
        'pipeline': pipeline_metadata(),
    }


@app.post('/extract-fingerprint', dependencies=[Depends(require_internal_key)])
async def extract_fingerprint(image: UploadFile = File(...), frame_json: str = Form(...)) -> dict:
    started = time.perf_counter()
    raw = await read_image_upload(image)
    roi, keypoints, descriptors, roi_metadata, timings = extract_features_with_timings(
        raw,
        parse_frame(frame_json),
    )
    points = metadata_for(keypoints)
    fingerprint = hashlib.sha256(
        (str(points) + (descriptors.tobytes().hex() if descriptors is not None else '')).encode()
    ).hexdigest()
    count = len(keypoints)
    return {
        'keypoint_count': count,
        'keypoints': points,
        'fingerprint_hash': fingerprint,
        'latency_ms': round((time.perf_counter() - started) * 1000, 2),
        'quality': 'acceptable' if count >= MINIMUM_KEYPOINTS else 'insufficient_features',
        'quality_score': quality_score(count),
        'reference_image_sha256': sha256(raw),
        'preprocessing_metadata': {
            'colour_space': 'grayscale',
            'max_processing_dimension': MAX_PROCESSING_DIMENSION,
            **pipeline_metadata(),
        },
        'processing_timings_ms': timings,
        'algorithm_version': ALGORITHM_VERSION,
        'descriptor_npy_base64': serialize_descriptors(descriptors),
        'roi_image_png_base64': serialize_png(roi),
        'roi_metadata': roi_metadata,
    }


@app.post('/verify-fingerprint', dependencies=[Depends(require_internal_key)])
async def verify_fingerprint(
    query: UploadFile = File(...),
    reference: UploadFile = File(...),
    reference_descriptors: UploadFile = File(...),
    reference_keypoints_json: str = Form(...),
    query_frame_json: str = Form(...),
) -> dict:
    started = time.perf_counter()
    query_raw = await read_image_upload(query)
    reference_raw = await read_image_upload(reference)
    query_image, query_keypoints, query_descriptors, query_roi_metadata, query_timings = extract_features_with_timings(
        query_raw,
        parse_frame(query_frame_json),
    )
    reference_image = decode_image(reference_raw)
    reference_keypoints = restore_keypoints(reference_keypoints_json)
    enrolled_descriptors = load_descriptors(await reference_descriptors.read())

    comparison, good_matches, inlier_mask = compare_features(
        query_keypoints,
        query_descriptors,
        reference_keypoints,
        enrolled_descriptors,
    )
    response = {
        **comparison,
        'quality_score': min(quality_score(len(query_keypoints)), quality_score(len(reference_keypoints))),
        'query_image_sha256': sha256(query_raw),
        'reference_image_sha256': sha256(reference_raw),
        'latency_ms': round((time.perf_counter() - started) * 1000, 2),
        'algorithm_version': ALGORITHM_VERSION,
        'processing_timings_ms': {
            **query_timings,
            'matching_ms': comparison['matching_ms'],
        },
        'decision_rule': {
            'minimum_keypoints': MINIMUM_KEYPOINTS,
            'minimum_inliers': MINIMUM_INLIERS,
            'inlier_ratio_threshold': MINIMUM_INLIER_RATIO,
        },
        'query_roi_png_base64': serialize_png(query_image),
        'query_roi_metadata': query_roi_metadata,
    }
    # Match proof is evidence for an accepted decision only. A non-match can
    # legitimately have no stable correspondence set, so drawing one would
    # add no value and can fail for degenerate OpenCV match geometry.
    if comparison['verdict'] == 'verified':
        proof = match_proof(
            query_image,
            query_keypoints,
            reference_image,
            reference_keypoints,
            good_matches,
            inlier_mask,
        )
        if proof:
            response['match_proof_base64'] = proof

    return response


@app.post('/benchmark', dependencies=[Depends(require_internal_key)])
def benchmark() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Benchmarking will be added in the CV evaluation milestone.'}
