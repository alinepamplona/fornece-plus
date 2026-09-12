import os

from dotenv import load_dotenv


load_dotenv()


def obter_configuracao_mysql():
    """Retorna as configurações de conexão lidas do arquivo .env."""
    return {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "fornece_plus"),
    }

