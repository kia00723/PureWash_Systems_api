let express = require('express');
var knex = require('../config/knex');
let router = express.Router();
const jwt = require("jsonwebtoken")
require("dotenv").config()
const bcrypt = require('bcrypt');
const saltRounds = 10;
const line = require("../routes/line")
var cron = require('node-cron');

router.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*'); // อนุญาตให้มีการเรียกใช้งาน API จากทุกๆ Origin
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // กำหนดว่าเมธอดใด ๆ ที่ยอมรับให้มีการเรียกใช้งาน API
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'); // อนุญาตให้มีการส่งค่า Authorization Bearer
    next();
});
/* GET home page. */
cron.schedule('* * * * *', async () => {
  
    let Washing = await knex.knex('washing_machine').select();
    let Transaction = await knex.knex('public.transaction_machine')
        .select('washing_machine_id', 'status','user_register_id')
        .max({ latest_value: 'date' })
        .max({ latest_time: 'time' })
        .groupBy('washing_machine_id', 'status','user_register_id')
    let response = []

    for (let i = 0; i < Washing.length; i++) {
        let body = {
            id: Washing[i].id,
            machine_name: Washing[i].machine_name,
            status: "open",
            time: "",
            drumsize: Washing[i].machine_drumsize,
            bakingsize: Washing[i].machine_bakingsize,
            spincycle: Washing[i].machine_spincycle,
            user_register_id : ""
        }
        response.push(body)
    }

    const latestData = await findLatestValuesById(Transaction);
    if (latestData.length != 0) {
        for (let re = 0; re < response.length; re++) {
            for (let ta = 0; ta < latestData.length; ta++) {
                if (response[re].id === latestData[ta].washing_machine_id) {
                    let t = compareTimes(latestData[ta].latest_time)
                    if (t === 1) {
                        try {
                            const Dates = new Date(latestData[ta].latest_value)
                            Dates.setDate(Dates.getDate() + 1);
                            const currentDate = new Date(Dates).toISOString().slice(0, 10);
                            let bodys ={
                                user_register_id: latestData[ta].user_register_id,
                                washing_machine_id: latestData[ta].washing_machine_id,
                                status: "open",
                                date: currentDate,
                                time: latestData[ta].latest_time,
                                paytype: "c",
                                createAt: new Date(),
                                createBy: "system",
                                modifyAt: new Date(),
                                modifyBy: "system",
                            }
                            await knex.knex('transaction_machine').insert(bodys);
                            let user = await knex.knex('user_register').where({id:latestData[ta].user_register_id}).select();
                            // console.log(user)
                            let body = "เรียกลูกค้า คุณ "+user[0].firstName+" เครื่องซักผ้าที่ท่านใช้บริการใกล็จะทำงานเสร็จเวลาที่เหลือประมาณ 1 นาที ขอบคุณครับ"
                            await line.notify(body, process.env.TOKEN)
                            return res.status(200).send({ message: "Notify Successfully." });

                        } catch (error) {
                            return res.json({ error: error.response.data.message });
                        }
                    }
                }
            }
        }
    }

    datas = response
    res.json(latestData)

});
router.get('/', function (req, res, next) {

    res.render('index', { title: 'Express' });

});
router.get('/get_userall', async function (req, res, next) {
    try {
        let data = await knex.knex('user_registers').select();
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/registerUser', async function (req, res, next) {
    try {
        let password = await hashPassword(req.body.password)
        let data = await knex.knex('user_register').insert({
            username: req.body.username,
            password: password,
            userType: req.body.userType,
            firstName: req.body.firstName,
            surName: req.body.surName,
            birthdate: req.body.birthdate,
            telephoneNumber: req.body.telephoneNumber,
            createAt: new Date(),
            createBy: req.body.createBy,
            modifyAt: new Date(),
            modifyBy: req.body.modifyBy,
        });
        let Result = await checkPassword({ password: password, })
        if (Result === true) {
            res.status(200).send({ message: true });
        } else {
            res.status(404).send({ message: false });
        }

    } catch (error) {
        res.json(error);
    }
});
router.post('/loginCheck', async function (req, res, next) {
    try {
        let Result = await checkPassword({ password: req.body.password, })
        let data = await knex.knex('user_register').where({ username: req.body.username }).select();
        if (data.length != 0 && Result == true) {
            const access_token = jwtGenerate(data)
            const refresh_token = jwtRefreshTokenGenerate(data)
            res.json({ access_token: access_token, refresh_token: refresh_token, username: data[0].username, user_type: data[0].user_type, id: data[0].id });
        } else {
            res.json({});
        }
    } catch (error) {
        console.log(error)
        res.json(error);
    }
});
router.post('/get_line', async function (req, res, next) {
    try {
        await line.notify(req.body.message,  process.env.TOKEN)
        return res.status(200).send({ message: "Notify Successfully." });
    } catch (error) {
        return res.json({ error: error.response.data.message });
    }
});
router.get('/getWashingMachine', async function (req, res, next) {
    try {
        // let check = await jwtValidate(req)
 
        let data = await knex.knex('washing_machine').select();
        let check = await jwtValidate(req)
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/getWashingMachineByid', async function (req, res, next) {
    try {
        let data = await knex.knex('washing_machine').where({ id: req.body.id }).select();
        let check = await jwtValidate(req)
        // console.log(data)
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.get('/getTransactionMachine', async function (req, res, next) {
    try {
        let check = await jwtValidate(req)
        let data = await knex.knex('public.transaction_machine')
            .select('washing_machine_id', 'status')
            .max({ latest_value: 'date' })
            .max({ latest_time: 'time' })
            .groupBy('washing_machine_id', 'status')


        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/getTransactionMachineByid', async function (req, res, next) {
    try {
        let check = await jwtValidate(req)
        let data = await knex.knex('public.transaction_machine')
            .select('washing_machine_id', 'status')
            .max({ latest_value: 'date' })
            .max({ latest_time: 'time' })
            .where({ 'washing_machine_id': req.body.id })
            .groupBy('washing_machine_id', 'status')
        res.json(data);
    } catch (error) {
        res.json(error);
    }
});
router.post('/addTransactionMachine', async function (req, res, next) {
    try {
        let check = await jwtValidate(req)
        let data = await knex.knex('transaction_machine').insert({
            user_register_id: req.body.user_register_id,
            washing_machine_id: req.body.washing_machine_id,
            status: req.body.status,
            date: req.body.date,
            time: req.body.time,
            paytype: req.body.paytype,
            createAt: new Date(),
            createBy: req.body.createBy,
            modifyAt: new Date(),
            modifyBy: req.body.modifyBy,
        });

        if (data != null) {
            res.status(200).send({ message: true });
        } else {
            res.status(404).send({ message: false });
        }

    } catch (error) {
        res.json(error);
    }
});
const findLatestValuesById = (arr) => {
    const latestValuesById = {};

    arr.forEach((item) => {
        console.log(item)
        item.latest_value = new Date(item.latest_value).toISOString().slice(0, 10);
        const currentDateTime = new Date(`${item.latest_value}T${item.latest_time}`).getTime();
        const latestItem = latestValuesById[item.washing_machine_id];

        if (!latestItem || currentDateTime > new Date(`${latestItem.latest_value}T${latestItem.latest_time}`).getTime()) {
            latestValuesById[item.washing_machine_id] = { ...item };
        }
    });

    return Object.values(latestValuesById);
};
const compareTimes = (datas) => {
    if (datas != null) {
        const time1Parts = datas.split(':');
        const time2all = new Date()
        const hours1 = parseInt(time1Parts[0], 10);
        const minutes1 = parseInt(time1Parts[1], 10);
        const seconds1 = parseInt(time1Parts[2], 10);

        const hours2 = parseInt(time2all.getHours());
        const minutes2 = parseInt(time2all.getMinutes());
        const seconds2 = parseInt(time2all.getSeconds());

        const totalMinutes1 = hours1 * 60 + minutes1;
        const totalMinutes2 = hours2 * 60 + minutes2;
        // console.log(totalMinutes1, totalMinutes2)
        let difference = 0;
        if (totalMinutes1 > totalMinutes2) {
            difference = Math.abs(totalMinutes1 - totalMinutes2);
        } else {
            difference = 0;
        }

        return difference
    } else {
        return 0
    }


};
async function hashPassword(password) {
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw new Error('Error hashing password');
    }
}
async function comparePassword(password, hashedPassword) {
    try {
        const isMatch = await bcrypt.compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
}
const jwtGenerate = (user) => {
    const accessToken = jwt.sign(
        { username: user.username, id: user.id, password: user.password, user_type: user.user_type },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1H", algorithm: "HS256" }
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
       
    } catch (error) {
        return res.sendStatus(403)
    }
}
async function checkPassword(data) {
    try {
        let password = await hashPassword(data.password)
        const isPasswordMatch = await comparePassword(data.password, password);
        let passcheck = false
        if (isPasswordMatch) {
            // console.log('Password is correct!');
            passcheck = true
        } else {
            passcheck = false
            // console.log('Password is incorrect!');
        }
        return passcheck
    } catch (error) {
        return res.sendStatus(403)
    }
}

module.exports = router;