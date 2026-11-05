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

        predictions = self.pipeline(text, top_k=None, truncation=True)[0]
        scores = {item["label"]: float(item["score"]) for item in predictions}
        predicted = max(scores, key=scores.get)
        return {
            "label": predicted,
            "score": scores[predicted],
            "scores": scores,
        }