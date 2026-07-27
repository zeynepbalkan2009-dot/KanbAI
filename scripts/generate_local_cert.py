from __future__ import annotations

import argparse
import ipaddress
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a local KanbAI HTTPS certificate.")
    parser.add_argument("--cert-dir", required=True)
    parser.add_argument("--dns-name", default="kanbai.local")
    parser.add_argument("--ip-address", default="127.0.0.1")
    parser.add_argument("--days", type=int, default=365)
    args = parser.parse_args()

    cert_dir = Path(args.cert_dir)
    cert_dir.mkdir(parents=True, exist_ok=True)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COMMON_NAME, args.dns_name),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "KanbAI Local Demo"),
        ]
    )

    alt_names: list[x509.GeneralName] = [
        x509.DNSName(args.dns_name),
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
    ]
    try:
        alt_names.append(x509.IPAddress(ipaddress.ip_address(args.ip_address)))
    except ValueError:
        pass

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc) - timedelta(minutes=5))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=args.days))
        .add_extension(x509.SubjectAlternativeName(alt_names), critical=False)
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=True,
                content_commitment=False,
                data_encipherment=True,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .sign(key, hashes.SHA256())
    )

    (cert_dir / "kanbai.local.key").write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    (cert_dir / "kanbai.local.crt").write_bytes(cert.public_bytes(serialization.Encoding.PEM))


if __name__ == "__main__":
    main()
