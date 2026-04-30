from src.utils import sha256_json


def test_sha256_json_is_deterministic():
    assert sha256_json({"b": 2, "a": 1}) == sha256_json({"a": 1, "b": 2})
