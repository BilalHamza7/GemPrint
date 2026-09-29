from fastapi import Depends, FastAPI, Header, HTTPException, status
from .core.config import INTERNAL_SERVICE_KEY

app = FastAPI(title='GemPrint CV Engine', version='0.1.0', docs_url=None, redoc_url=None)

def require_internal_key(x_internal_service_key: str | None = Header(default=None)) -> None:
    if not INTERNAL_SERVICE_KEY or x_internal_service_key != INTERNAL_SERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Internal service authentication failed')

@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'gemprint-cv-engine'}

@app.post('/extract-fingerprint', dependencies=[Depends(require_internal_key)])
def extract_fingerprint() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Fingerprint extraction will be added in the CV milestone.'}

@app.post('/verify-fingerprint', dependencies=[Depends(require_internal_key)])
def verify_fingerprint() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Fingerprint verification will be added in the CV milestone.'}

@app.post('/benchmark', dependencies=[Depends(require_internal_key)])
def benchmark() -> dict[str, str]:
    return {'status': 'not_implemented', 'message': 'Benchmarking will be added in the CV milestone.'}
