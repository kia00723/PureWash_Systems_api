let express = require('express');
var knex = require('../config/knex');
let router = express.Router();
const jwt = require("jsonwebtoken")
require("dotenv").config()

router.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-with,content-type');
    res.setHeader('Access-Conrol-Allow-Credentials', true);
    next();
});
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
router.get('/get_userall', async function (req, res, next) {
    try {
        let data = await knex.knex('user').select();
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/get_user_byid', async function (req, res, next) {
    try {
        let id = req.body.id
        // let id = 2
        let data = await knex.knex('user').where({ id: id }).select();
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/add_userdetails', async function (req, res, next) {
    try {
        console.log(req.body)
        let data = await knex.knex('user').insert({ id: req.body.id, user_name: req.body.user_name, password: req.body.password, user_type: req.body.user_type });
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/update_userdetails', async function (req, res, next) {
    try {
        let data = await knex.knex('user_register').where({ id: req.body.id }).update({ first_name: req.body.first_name, sur_name: req.body.sur_name, id_card: req.body.id_card, sex: req.body.sex, birthdate: req.body.birthdate, telephone_number: req.body.telephone_number, address: req.body.address, sub_district: req.body.sub_district, district: req.body.district, province: req.body.province, create_date: new Date(), create_at: 'Admin', modify_date: new Date(), modify_at: 'Admin' });
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/dalete_userdetails', async function (req, res, next) {
    try {
        let data = await knex.knex('user_register').where({ id: req.body.id }).del();
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/loginCheck', async function (req, res, next) {
    try {
        let data = await knex.knex('user').where({ username: req.body.username, password: req.body.password }).select();
        if (data.length != 0) {
            const access_token = jwtGenerate(data)
            const refresh_token = jwtRefreshTokenGenerate(data)
            res.json({ access_token: access_token, refresh_token: refresh_token, username: data[0].username, user_type: data[0].user_type });
        } else {
            res.json({});
        }
    } catch (error) {
        console.log(error)
        res.json(error);
    }
});

const jwtGenerate = (user) => {
    const accessToken = jwt.sign(
        { username: user.username, id: user.id, password: user.password, user_type: user.user_type },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "3m", algorithm: "HS256" }
    )

    return accessToken
}
const jwtRefreshTokenGenerate = (user) => {
    const refreshToken = jwt.sign(
        { username: user.username, id: user.id, password: user.password, user_type: user.user_type },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "1d", algorithm: "HS256" }
    )

    return refreshToken
}
const jwtValidate = (req, res, next) => {
    try {
        if (!req.headers["authorization"]) return res.sendStatus(401)

        const token = req.headers["authorization"].replace("Bearer ", "")

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) throw new Error(error)
        })
        next()
    } catch (error) {
        return res.sendStatus(403)
    }
}
module.exports = router;