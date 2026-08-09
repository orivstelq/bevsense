import argparse
import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send one simulated telemetry reading through the FastAPI API."
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--organization-id", required=True)
    parser.add_argument("--location-id", required=True)
    parser.add_argument("--controller-id", required=True)
    parser.add_argument("--tray-id", required=True)
    parser.add_argument("--reading-id", required=True)
    parser.add_argument("--timestamp", required=True)
    parser.add_argument("--gross-weight-grams", required=True, type=float)
    return parser.parse_args()


def _endpoint(arguments: argparse.Namespace) -> str:
    segments = (
        "api",
        "v1",
        "organizations",
        arguments.organization_id,
        "locations",
        arguments.location_id,
        "controllers",
        arguments.controller_id,
        "readings",
        arguments.reading_id,
    )
    path = "/".join(quote(segment, safe="") for segment in segments)
    return f"{arguments.base_url.rstrip('/')}/{path}"


def main() -> int:
    arguments = _arguments()
    body = json.dumps(
        {
            "trayId": arguments.tray_id,
            "timestamp": arguments.timestamp,
            "grossWeightGrams": arguments.gross_weight_grams,
        }
    ).encode()
    request = Request(
        _endpoint(arguments),
        data=body,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )

    try:
        with urlopen(request, timeout=5) as response:
            payload = json.load(response)
            print(f"HTTP {response.status}")
            print(f"readingId={payload['readingId']}")
            print(f"result={payload['result']}")
            return 0
    except HTTPError as error:
        try:
            detail = json.load(error).get("detail", "Request rejected")
        except (json.JSONDecodeError, AttributeError):
            detail = "Request rejected"
        print(f"HTTP {error.code}")
        print(f"detail={detail}")
        return 1
    except URLError as error:
        print("HTTP request failed")
        print(f"detail={error.reason}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
