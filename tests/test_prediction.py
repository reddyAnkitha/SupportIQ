from unittest.mock import patch

from backend.services.prediction import predict_satisfaction_risk


def test_prediction_service():
    mock_model = patch(
        "backend.services.prediction.load_model"
    )

    with mock_model as load_model:
        model = load_model.return_value

        model.predict.return_value = [1]
        model.predict_proba.return_value = [[0.2, 0.8]]

        result = predict_satisfaction_risk(
            customer_age=30,
            priority="High",
            ticket_type="Technical issue",
            channel="Email",
        )

        assert result["risk"] == 1
        assert result["risk_label"] == "High Risk"
        assert result["risk_probability"] == 0.8
