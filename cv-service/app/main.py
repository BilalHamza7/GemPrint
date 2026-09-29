import hashlib
import time
import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from .core.config import INTERNAL_SERVICE_KEY

app = FastAPI(title='GemPrint CV Engine', version='0.1.0', docs_url=None, redoc_url=None)

def require_internal_key(x_internal_service_key: str | None = Header(default=None)) -> None:
    if not INTERNAL_SERVICE_KEY or x_internal_service_key != INTERNAL_SERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Internal service authentication failed')

@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'gemprint-cv-engine'}

@app.post('/extract-fingerprint', dependencies=[Depends(require_internal_key)])
async def extract_fingerprint(image: UploadFile = File(...)) -> dict:
    started = time.perf_counter()
    raw = await image.read()
    matrix = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if matrix is None: raise HTTPException(400, 'Unreadable image.')
    gray = cv2.cvtColor(matrix, cv2.COLOR_BGR2GRAY)
    processed = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    points, descriptors = cv2.SIFT_create(nfeatures=1500, contrastThreshold=0.03, edgeThreshold=10).detectAndCompute(processed, None)
    metadata = [{'x': round(p.pt[0], 3), 'y': round(p.pt[1], 3), 'size': round(p.size, 3), 'angle': round(p.angle, 3), 'response': round(p.response, 6), 'octave': p.octave} for p in points]
    return {'keypoint_count': len(points), 'keypoints': metadata, 'descriptors': descriptors.tolist() if descriptors is not None else [], 'fingerprint_hash': hashlib.sha256((str(metadata) + (descriptors.tobytes().hex() if descriptors is not None else '')).encode()).hexdigest(), 'latency_ms': round((time.perf_counter()-started)*1000, 2), 'quality': 'acceptable' if len(points) >= 10 else 'insufficient_features'}

@app.post('/verify-fingerprint', dependencies=[Depends(require_internal_key)])
def verify_fingerprint() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Fingerprint verification will be added in the CV milestone.'}

@app.post('/benchmark', dependencies=[Depends(require_internal_key)])
def benchmark() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Benchmarking will be added in the CV milestone.'}
