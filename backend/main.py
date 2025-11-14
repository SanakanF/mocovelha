from fastapi import FastAPI
from backend.api import endpoints

app = FastAPI(title="MocoVelha API")

app.include_router(endpoints.router)


@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do MocoVelha"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
