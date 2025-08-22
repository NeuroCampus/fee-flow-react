## Fee Flow Project

### How to Run the Backend (Django)

1. Navigate to the backend directory:
	```sh
	cd college_fee_backend
	```
2. Activate the virtual environment:
	```sh
	source env/bin/activate
	```
3. Install dependencies:
	```sh
	pip install -r requirements.txt
	```
4. Run migrations:
	```sh
	python manage.py migrate
	```
5. Start the backend server:
	```sh
	python manage.py runserver
	```

### How to Run the Frontend (React)

1. Navigate to the project root:
	```sh
	cd .. # if you are in the backend folder
	```
2. Install dependencies:
	```sh
	npm install
	```
3. Start the frontend server:
	```sh
	npm run dev
	```

The frontend will run on `http://localhost:3000` and the backend on `http://localhost:8000` by default.
