'use strict';

//SQL Magic (POSTGRES) query to be able to run that migration file as much as you want :)
// ﻿DELETE FROM public."SequelizeMeta" WHERE name='20180115120000-change-email-in-social-account-2-data.js';
// ﻿DELETE FROM public."LocalLogins";


function getSQLDateFormated(date) {
    return date.getUTCFullYear() + "-" +
        ("00" + (date.getUTCMonth() + 1)).slice(-2) + "-" +
        ("00" + date.getUTCDate()).slice(-2) + " " +
        ("00" + date.getUTCHours()).slice(-2) + ":" +
        ("00" + date.getUTCMinutes()).slice(-2) + ":" +
        ("00" + date.getUTCSeconds()).slice(-2);
}

function getUserSelectQuery() {
    if (process.env.DB_TYPE === "postgres") {
        return "select * from \"public\".\"Users\"";
    } else {
        //TODO support mysql
        throw new Error(process.env.DB_TYPE + " database is not supported now :'(");
    }
}

function getUserProfileSelectQuery() {
    if (process.env.DB_TYPE === "postgres") {
        return "select * from \"public\".\"UserProfiles\"";
    } else {
        //TODO support mysql
        throw new Error(process.env.DB_TYPE + " database is not supported now :'(");
    }
}

function getUsersSelectQueryNbOfResult(users) {
    if (process.env.DB_TYPE === "postgres") {
        return users[0].length; //TODO test if no user
    } else {
        //TODO support mysql
        throw new Error(process.env.DB_TYPE + " database is not supported now :'(");
    }
}

function getUserProfilesSelectQueryNbOfResult(userProfiles) {
    if (process.env.DB_TYPE === "postgres") {
        return userProfiles[0].length; //TODO test if no user
    } else {
        //TODO support mysql
        throw new Error(process.env.DB_TYPE + " database is not supported now :'(");
    }
}

function buildInsertQuery(users, i) {
    // We assume that there are no social login to migrate.
    // That's the case at RTS : we have social login but they are migrated from openAM to the idp as local account
    // BR is not supposed to have social login
    if (process.env.DB_TYPE === "postgres") {
        var login = users[0][i].email;
        var password = users[0][i].password;
        var verified = users[0][i].verified ? true : false;
        var password_changed_at = users[0][i].password_changed_at;
        var last_login_at = users[0][i].last_login_at;
        var user_id = users[0][i].id;
        var created_at = getSQLDateFormated(users[0][i].created_at);
        var updated_at = getSQLDateFormated(users[0][i].updated_at);

        console.log("user [" + i + "] login: " + login);
        console.log("user [" + i + "] password: " + password);
        console.log("user [" + i + "] verified: " + verified);
        console.log("user [" + i + "] password_changed_at: " + password_changed_at);
        console.log("user [" + i + "] last_login_at: " + last_login_at);
        console.log("user [" + i + "] user_id: " + user_id);
        console.log("user [" + i + "] created_at: " + created_at);
        console.log("user [" + i + "] updated_at: " + updated_at);

        return "insert into \"public\".\"LocalLogins\" (login, password, verified, password_changed_at, last_login_at, user_id, created_at, updated_at) " +
            " VALUES ('" + login + "', '" + password + "', '" + verified + "', '" + password_changed_at + "', '" + last_login_at + "', '" + user_id + "', '" + created_at + "', '" + updated_at + "')";
    } else {
        //TODO support mysql
        throw new Error(process.env.DB_TYPE + " database is not supported now :'(");
    }
}

function buildUpdateQueries(userProfiles, i) {
    if (process.env.DB_TYPE === "postgres") {
        console.log('userProfile[0][i]', userProfiles[0][i]);
        var userId = userProfiles[0][i].user_id;
        var fieldsToUpdates = [];
        //TODO extract common part of the query and use ".format"
        if (userProfiles[0][i].firstname) {
            fieldsToUpdates.push("update \"public\".\"Users\" set 'first_name' =  '" + userProfiles[0][i].firstname + "' where id = " + userId);
        }
        if (userProfiles[0][i].lastname) {
            fieldsToUpdates.push("update \"public\".\"Users\" set 'first_name' =  '" + userProfiles[0][i].lastname + "' where id = " + userId);
        }
        if (userProfiles[0][i].gender) {
            fieldsToUpdates.push("update \"public\".\"Users\" set 'first_name' =  '" + userProfiles[0][i].gender + "' where id = " + userId);
        }
        if (userProfiles[0][i].date_of_birth) {
            fieldsToUpdates.push("update \"public\".\"Users\" set 'first_name' =  '" + userProfiles[0][i].date_of_birth + "' where id = " + userId);
        }
        if (userProfiles[0][i].language) {
            fieldsToUpdates.push("update \"public\".\"Users\" set 'first_name' =  '" + userProfiles[0][i].language + "' where id = " + userId);
        }
        return fieldsToUpdates;
    } else {
        //TODO support mysql
        throw new Error(process.env.DB_TYPE + " database is not supported now :'(");
    }
}


module.exports = {
    up: function (queryInterface, Sequelize) {
        return new Promise(function (resolve, reject) {
            //FIXME POSTGRES specific use process.env.DB_TYPE to see if current run use postgres (RTS) or mysql(BR). For other Database don't do anything and CRASH
            return queryInterface.sequelize.query(getUserSelectQuery()).then(function (users) {
                var batch = [];
                // insert data in appropriate table
                let nb = getUsersSelectQueryNbOfResult(users);
                for (var i = 0; i < nb; i++) {
                    console.log("Migratinf local login " + (i + 1) + " of " + nb);
                    batch.push(queryInterface.sequelize.query(buildInsertQuery(users, i)));
                }

                return Promise.all(batch);
            }).then(function () {
                console.log("now migrating user profile...");
                return queryInterface.sequelize.query(getUserProfileSelectQuery());
            }).then(function (userProfiles) {
                console.log("userProfiles: ", userProfiles);
                console.log("userProfiles[0][i]: ", userProfiles[0][0]);
                var batch = [];
                // insert data in appropriate table
                let nb = getUserProfilesSelectQueryNbOfResult(userProfiles);
                for (var i = 0; i < nb; i++) {
                    console.log("Migrating user profile " + (i + 1) + " of " + nb + "...");
                    var updateQueries = buildUpdateQueries(userProfiles[0][i], i);
                    for (var j = 0; j < updateQueries.length; j++) {
                        console.log("New udpate query", j);
                        console.log("updateQueries[" + j + "]:", updateQueries[j]);
                        batch.push(queryInterface.sequelize.query(updateQueries[j]));
                    }
                }
                return Promise.all(batch);
                //TODO
                // Drop column

                // Drop table user profile

            }).then(resolve).catch(reject);
        });
    },

    down: function (queryInterface, Sequelize) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }
}
