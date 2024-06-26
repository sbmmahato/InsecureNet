const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
const path = require('path')
router.use(express.static( path.join(__dirname,"../public")))
const db = require(path.join(__dirname,"../db/dbConnect"));
const session = require('express-session');
require('dotenv').config();
router.use(session({
    secret: process.env.secret,
    resave: false,
    saveUninitialized: false
}));
let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.email,
        pass: process.env.pass
    }
});


router.get('/', (req,res)  => {
    if (!req.session.isLoggedIn) {
        res.redirect('/login');
        return;
    }
    db.query('SELECT * FROM products', (error, results, fields) => {
        if (error) {
            console.error('Error executing query: ' + error);
            res.send(error);
            return;
        }
        res.render('products',{products:results, isLoggedIn:req.session.isLoggedIn});
    });
})

router.post('/search', (req, res) => {
    if (!req.session.isLoggedIn) {
        res.redirect('/login');
        return;
    }
    db.query('SELECT * FROM products WHERE name LIKE \'\%'+req.body.name+'\%\';', (error, results, fields) => {
        if (error) {
            console.error('Error executing query: ' + error);
            res.send(error);
            return;
        }
        console.log(results)
        res.render('products',{products:results, isLoggedIn:req.session.isLoggedIn});
    });
})


router.get('/login', (req, res) =>{
    if (req.session.isLoggedIn) {
        res.redirect("/")
        return;
    }
    res.render('login');
})

router.post('/login', (req, res) => {
    if (req.session.isLoggedIn) {
        res.redirect("/")
        return;
    }
    db.query('SELECT * FROM users WHERE email = \''+req.body.email+'\'  AND password = \''+req.body.password+'\'', (error, results, fields) => {
        if (error) {
            console.error('Error executing query: ' + error);
            res.send(error);
            return;
        }
        if (results.length > 0) {
            req.session.isLoggedIn = true;
            res.redirect('/');
        }
        else{
            res.redirect('/register');
        }
    });
});

router.get('/register', (req,res) => {
    if (req.session.isLoggedIn){
        res.redirect("/");
        return;
    }
    res.render('register');
})

router.post('/register', (req, res) => {
    if (req.session.isLoggedIn){
        res.redirect("/");
        return;
    }
    db.query("SELECT * FROM users WHERE email = '"+req.body.email+"';", (error, results, fields) => {
        if (error) {
            console.error('Error executing query: ' + error);
            res.send(error);
            return;
        }
        if (results.length > 0) {
            res.redirect('/login');
        }
        else{
            db.query("INSERT INTO users (name,email,password) VALUES ('"+req.body.fullname+"','"+req.body.email+"','"+req.body.password+"');", (error, results, fields) => {
            if (error) {
                console.error('Error executing query: ' + error);
                return;
            }
            res.redirect('/login');
            });
        }
    });
});

router.get('/forgotPass', (req, res) => {
    if (req.session.isLoggedIn){
        res.redirect("/");
        return;
    }
    res.render('forgotPass')
})

router.post('/forgotPass', (req,res) => {
    if (req.session.isLoggedIn){
        res.redirect("/");
        return;
    }
    db.query('SELECT * FROM users WHERE email = \''+req.body.email+'\';', (error, results, fields) => {
        if (error) {
            console.error('Error executing query: ' + error);
            res.send(error);
            return;
        }
        if (results.length > 0){
            email = results[0].email;
            otp = randomNumber = Math.floor(Math.random() * 9000) + 1000;
            let mailOptions = {
                from: process.env.email,
                to: email,
                subject: 'OTP for Password Reset',
                text: 'Your OTP for password change is '+ otp
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error occurred:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
            db.query('UPDATE users SET otp='+otp+' WHERE email=\''+email+'\';', (error, results, fields) => {
                if (error) {
                    console.error('Error executing query: ' + error);
                    res.send(error);
                    return;
                }
                res.render('changePass',{email:email})
            });
        }
        else{
            res.redirect('/register');
        }
    });
})

router.post('/changePass', (req, res) => {
    if (req.session.isLoggedIn){
        res.redirect("/");
        return;
    }
    otp = req.body.otp;
    console.log(otp);
    //console.log('UPDATE users set password = \'' +req.body.newPassword+'\' WHERE otp = '+otp+' AND email = \''+req.body.email+'\';')
    db.query('UPDATE users set password = \'' +req.body.newPassword+'\' WHERE email = \''+req.body.email+'\' AND otp = '+otp+';', (error, results, fields) => {
        if (error) {
            console.error('Error executing query: ' + error);
            res.send(error);
            return;
        }
        res.redirect('/login');
    });
})

router.post('/logout', (req, res) => {
    if (req.session.isLoggedIn){
        req.session.isLoggedIn = false;
    }
    res.redirect("/login");
})

module.exports = router;