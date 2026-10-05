declare global { namespace Express { interface Request { user?: { id: string; email: string; laboratoryId: string; role: string } } } }
export {}
