FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY . .
EXPOSE 8000
ENTRYPOINT ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]