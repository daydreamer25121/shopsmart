# Create a minimal main.py
@"
from fastapi import FastAPI

app = FastAPI(title="ShopSmart ML Service")

@app.get("/")
def read_root():
    return {"message": "ShopSmart ML Microservice is running!"}

@app.post("/recommend")
def recommend(data: dict):
    return {"recommendations": ["Product1", "Product2"]}

print("Minimal FastAPI app loaded")
"@ | Out-File -Encoding utf8 main.py