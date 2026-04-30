from src.utils import sha256_json


def main() -> None:
    assert sha256_json({"b": 2, "a": 1}) == sha256_json({"a": 1, "b": 2})
    print("worker tests passed")


if __name__ == "__main__":
    main()
