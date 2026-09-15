from backend.services.nlp_prediction import analyze_text


def test_analyze_text():
    result = analyze_text(
        "The payment failed and the customer cannot complete the payment."
    )

    assert result["status"] == "success"
    assert result["text_length"] > 0
    assert result["word_count"] > 0
    assert len(result["important_terms"]) > 0


def test_empty_text():
    try:
        analyze_text("")
        assert False
    except ValueError as error:
        assert str(error) == "Ticket description cannot be empty."
