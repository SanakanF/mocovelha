# Backend MocoVelha

Este diretório contém o código do backend FastAPI do projeto MocoVelha.

## Como executar

1. Crie e ative um ambiente virtual Python (opcional, mas recomendado).
2. Instale as dependências:

```bash
pip install -r requirements.txt
```

3. Execute o servidor de desenvolvimento:

```bash
uvicorn backend.main:app --reload
```

A API estará disponível em `http://127.0.0.1:8000`.

## Endpoints iniciais

- `GET /status`: retorna `{ "status": "ok" }` para indicar que a API está ativa.
