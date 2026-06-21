from app.services.whatsapp import _normalize_whatsapp_address, _normalize_whatsapp_from


def test_normalize_whatsapp_address_indian_local():
    assert _normalize_whatsapp_address("9876543210") == "whatsapp:+919876543210"


def test_normalize_whatsapp_address_e164():
    assert _normalize_whatsapp_address("+919876543210") == "whatsapp:+919876543210"


def test_normalize_whatsapp_address_already_prefixed():
    assert _normalize_whatsapp_address("whatsapp:+919876543210") == "whatsapp:+919876543210"


def test_normalize_whatsapp_address_invalid():
    assert _normalize_whatsapp_address("   ") is None


def test_normalize_whatsapp_from():
    assert _normalize_whatsapp_from("whatsapp:+14155238886") == "whatsapp:+14155238886"
    assert _normalize_whatsapp_from("+14155238886") == "whatsapp:+14155238886"
