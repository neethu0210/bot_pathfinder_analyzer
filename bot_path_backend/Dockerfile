FROM python:3.9
WORKDIR /app
COPY . /app
RUN pip install flask flask-cors
EXPOSE 5000
CMD ["python", "bot_path.py"]