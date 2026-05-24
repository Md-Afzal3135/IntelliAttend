"""
Custom email backend that uses certifi CA bundle to fix macOS SSL
certificate verification issue with Gmail SMTP.
"""
import ssl
import certifi
from django.core.mail.backends.smtp import EmailBackend


class CertifiEmailBackend(EmailBackend):
    """
    Extends Django's SMTP backend to use certifi's trusted CA bundle,
    fixing the SSL certificate error on macOS Python 3.13.
    """

    def open(self):
        if self.connection:
            return False

        connection_params = {
            'host': self.host,
            'port': self.port,
            'timeout': self.timeout,
        }

        if self.use_ssl:
            connection_params['context'] = ssl.create_default_context(
                cafile=certifi.where()
            )

        try:
            import smtplib
            if self.use_ssl:
                self.connection = smtplib.SMTP_SSL(**connection_params)
            else:
                self.connection = smtplib.SMTP(**connection_params)

            if self.use_tls:
                ctx = ssl.create_default_context(cafile=certifi.where())
                self.connection.ehlo()
                self.connection.starttls(context=ctx)
                self.connection.ehlo()

            if self.username and self.password:
                self.connection.login(self.username, self.password)

            return True
        except Exception:
            if not self.fail_silently:
                raise
