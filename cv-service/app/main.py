import base64
import hashlib
import time

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status

from .core.config import INTERNAL_SERVICE_KEY

ALGORITHM_VERSION = 'sift-clahe-v1'
MINIMUM_KEYPOINTS = 10
MINIMUM_INLIERS = 10
MINIMUM_INLIER_RATIO = 0.5

app = FastAPI(title='GemPrint CV Engine', version='0.1.0', docs_url=None, redoc_url=None)


def require_internal_key(x_internal_service_key: str | None = Header(default=None)) -> None:
    if not INTERNAL_SERVICE_KEY or x_internal_service_key != INTERNAL_SERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Internal service authentication failed')


def decode_image(raw: bytes, mode: int = cv2.IMREAD_GRAYSCALE) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), mode)
    if image is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unreadable image.')
    return image


def preprocess(image: np.ndarray) -> np.ndarray:
    return cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(image)


def extract_features(raw: bytes) -> tuple[np.ndarray, list[cv2.KeyPoint], np.ndarray | None]:
    image = decode_image(raw)
    keypoints, descriptors = cv2.SIFT_create(
        nfeatures=1500,
        contrastThreshold=0.03,
        edgeThreshold=10,
    ).detectAndCompute(preprocess(image), None)
    return image, keypoints, descriptors


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


def match_proof(
    query_image: np.ndarray,
    query_keypoints: list[cv2.KeyPoint],
    reference_image: np.ndarray,
    reference_keypoints: list[cv2.KeyPoint],
    matches: list[cv2.DMatch],
    inlier_mask: np.ndarray | None,
) -> str:
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Could not create match proof.')
    return base64.b64encode(encoded.tobytes()).decode('ascii')


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'gemprint-cv-engine'}


@app.post('/extract-fingerprint', dependencies=[Depends(require_internal_key)])
async def extract_fingerprint(image: UploadFile = File(...)) -> dict:
    started = time.perf_counter()
    raw = await image.read()
    _, keypoints, descriptors = extract_features(raw)
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
            'clahe_clip_limit': 2.0,
            'clahe_tile_grid': [8, 8],
            'sift_nfeatures': 1500,
        },
        'algorithm_version': ALGORITHM_VERSION,
    }


@app.post('/verify-fingerprint', dependencies=[Depends(require_internal_key)])
async def verify_fingerprint(query: UploadFile = File(...), reference: UploadFile = File(...)) -> dict:
    started = time.perf_counter()
    query_raw = await query.read()
    reference_raw = await reference.read()
    query_image, query_keypoints, query_descriptors = extract_features(query_raw)
    reference_image, reference_keypoints, reference_descriptors = extract_features(reference_raw)

    if (
        query_descriptors is None
        or reference_descriptors is None
        or len(query_keypoints) < MINIMUM_KEYPOINTS
        or len(reference_keypoints) < MINIMUM_KEYPOINTS
    ):
        return {
            'verdict': 'inconclusive',
            'reason': 'Insufficient visible features for a reliable comparison.',
            'quality_score': min(quality_score(len(query_keypoints)), quality_score(len(reference_keypoints))),
            'query_image_sha256': sha256(query_raw),
            'reference_image_sha256': sha256(reference_raw),
            'latency_ms': round((time.perf_counter() - started) * 1000, 2),
            'algorithm_version': ALGORITHM_VERSION,
        }

    matcher = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=50))
    candidate_pairs = matcher.knnMatch(query_descriptors, reference_descriptors, k=2)
    good_matches = [first for first, second in candidate_pairs if first.distance < 0.75 * second.distance]
    inlier_mask: np.ndarray | None = None
    inliers = 0
    if len(good_matches) >= MINIMUM_INLIERS:
        source = np.float32([query_keypoints[match.queryIdx].pt for match in good_matches]).reshape(-1, 1, 2)
        destination = np.float32([reference_keypoints[match.trainIdx].pt for match in good_matches]).reshape(-1, 1, 2)
        _, inlier_mask = cv2.findHomography(source, destination, cv2.RANSAC, 5.0)
        inliers = int(inlier_mask.sum()) if inlier_mask is not None else 0

    ratio = inliers / len(good_matches) if good_matches else 0
    return {
        'verdict': 'verified' if inliers >= MINIMUM_INLIERS and ratio >= MINIMUM_INLIER_RATIO else 'not_verified',
        'good_match_count': len(good_matches),
        'inlier_count': inliers,
        'inlier_ratio': round(ratio, 4),
        'confidence_score': round(ratio * 100, 2),
        'quality_score': min(quality_score(len(query_keypoints)), quality_score(len(reference_keypoints))),
        'query_image_sha256': sha256(query_raw),
        'reference_image_sha256': sha256(reference_raw),
        'latency_ms': round((time.perf_counter() - started) * 1000, 2),
        'algorithm_version': ALGORITHM_VERSION,
        'match_proof_base64': match_proof(
            query_image,
            query_keypoints,
            reference_image,
            reference_keypoints,
            good_matches,
            inlier_mask,
        ),
    }


@app.post('/benchmark', dependencies=[Depends(require_internal_key)])
def benchmark() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Benchmarking will be added in the CV evaluation milestone.'}
