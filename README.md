
# Setup and Current Status Quo

## CLOUDINARY
SETUP YOUR CLOUDINARY(for image storage) (we can skip it now): 
    - Visit cloudinary
    
    - Signup and login using the link below (referral will give us extra credits for our main project)
    https://cloudinary.com/invites/lpov9zyyucivvxsnalc5/zf2t3zaph0xocjbwwsy7?t=default

    - Then create a simple preset called profile_pics
        Ask gpt, it will guide (too simple)

    - Then take keys and cloud names and put in .env files


## SUPABASE
SETUP YOUR SUPABASE (Critical Part):
    - 1. Create your supabase account
    - 2. Now create the current db on which this repo is relying
        Use the below file and create tables and schema 
        minWrok/-2-CurrTables.sql

    - 3. After tables, now get all your supabase credentials and put in .env files

    Great, We are nearly done with setup


## MAIL-SMTP (GMAIL)
SETUP YOUR GMAIL-SMTP (for mail auths) (we can skip it for now):
    - 1. Visit your google account
    - 2. Enable 2FA (two factor auths)
    - 3. Now search for app in the search box on top
    - 4. Select the App passwords, Security option
      It will open a new page, visit and name your app (doesn't matter, name anything)
    - 5. Now copy the 16 chars code shown and put as GMAIL PASS in .env

    Now we are done with the mail auth part too
    

## BACKEND
SETUP THE BACKEND:
    cd backend
    npm install


## FRONTEND
SETUP THE FRONTEND:
    cd frontend
    npm install

## STARTING
RUN BOTH:
    Open two seperate terminal
    in first:
        cd backend
        npm run dev
    
    in second:
        cd frontend
        npm run dev


Done!!!
