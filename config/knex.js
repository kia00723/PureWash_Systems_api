var knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port : 5432,
        user: 'postgres',
        password: 'kia00723',
        database: 'test_cou'
    }
});


knex.raw("SELECT 1").then(() => {
        console.log("Database connected");
    })
    .catch((e) => {
        console.log("Database Not connected");
        console.error(e);
    });


module.exports.knex = knex;