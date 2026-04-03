
# Setup and Current Status Quo

## CLOUDINARY
SETUP YOUR CLOUDINARY(for image storage) (we can skip it now): 

```python
- Visit cloudinary    
- Signup and login using the link below (referral will give us extra credits for our main project)
    https://cloudinary.com/invites/lpov9zyyucivvxsnalc5/zf2t3zaph0xocjbwwsy7?t=default
- Then create a simple preset called profile_pics
- Ask GPT, it will guide (too simple)
- Then take keys and cloud names and put in .env files
```

## SUPABASE
SETUP YOUR SUPABASE (Critical Part):

```python
- Create your supabase account
- Now create the current db on which this repo is relying
    Use the below file and create tables and schema 
    minWrok/-2-CurrTables.sql
- After tables, now get all your supabase credentials and put in .env files
```
Great, We are nearly done with setup

## MAIL-SMTP (GMAIL)
SETUP YOUR GMAIL-SMTP (for mail auths) (we can skip it for now):

```python
- Visit your google account
- Enable 2FA (two factor auths)
- Now search for app in the search box on top
- Select the App passwords, Security option. It will open a new page, visit and name your app (doesnt matter, name anything)
- Now copy the 16 chars code shown and put as GMAIL PASS in .env
```
Now we are done with the mail auth part too


## BACKEND
SETUP THE BACKEND:
```python
    cd backend
    npm install
```

## FRONTEND
SETUP THE FRONTEND:
```python
    cd frontend
    npm install
```

## STARTING
RUN BOTH: Open two seperate terminal

```python
    # in first:
        cd backend
        npm run dev
```

```python
    # in second:
        cd frontend
        npm run dev
```

Done!!!
