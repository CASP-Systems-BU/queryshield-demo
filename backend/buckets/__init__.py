from dotenv import load_dotenv, find_dotenv


# try to load env variable from .env file
# dotenv_path = find_dotenv()
dotenv_path = "/home/ubuntu/queryshield-demo/backend/credentials/.env"
if dotenv_path:
    load_dotenv(dotenv_path)
