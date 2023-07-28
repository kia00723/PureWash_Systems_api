const axios = require('axios');
const qs = require('qs');

const url_line_token = "https://notify-bot.line.me/oauth/token";

//Get Token
exports.token =  async (code,username) => {
    axios.post(
        url_line_token,
        qs.stringify({
            grant_type : 'authorization_code',
            code : code,
            redirect_uri : 'http://localhost:4000/line/redirect',
            client_id : 'client id',
            client_secret : 'client secret'
        }),
        {
            headers : {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }
    ).then( (response) => {
        console.log('Get Token : ' + response.data.access_token);

        //Logic process save or update access token

        return response.data;
    })
    .catch(function (error) {
        console.error('Error : ',error.response.data.message);
        return error;
    });
}



const url_line_notification = "https://notify-api.line.me/api/notify";

//Notification to Line
exports.notify = async (text,token) => {
    await axios.post(
        url_line_notification,
        qs.stringify({message:text}),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization' : 'Bearer ' + token
            }
        },
        ).then(function (response) {
            console.log('Notify Successfully : ',response.data);
            //Logic process save notification logs
            return response.data;
        })
        .catch(function (error) {
            console.error('Notification Error : ',error);
        });
}


