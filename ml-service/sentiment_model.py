from transformers import pipeline


class SentimentModel:

    def __init__(self):
        self.model_name = "w11wo/indonesian-roberta-base-sentiment-classifier"

        self.pipeline = pipeline(
            "sentiment-analysis",
            model=self.model_name,
            tokenizer=self.model_name
        )

    def predict(self, text: str):

        result = self.pipeline(text)[0]

        return {
            "label": result["label"],
            "score": float(result["score"])
        }