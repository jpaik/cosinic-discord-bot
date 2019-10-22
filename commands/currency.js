require('dotenv').config();
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;

var bank = new JsonDB(new JsonDBConfig("db/bank", true, false, '/'));

const EMOJI_MONEY = ':moneybag:';
const EMOJI_MONEY_MOUTH = ':money_mouth:';
const EMOJI_MONEY_WINGS = ':money_with_wings:';
const EMOJI_DOLLAR = ':euro:';
const CURRENCY = 'Cosinic Coin';

/**
 * Bank Layout
 * {
 * * accounts {
 * * * userId (discord tag) {
 * * * * balance
 * * *}
 * * }
 * }
 */

var CURRENCY_COMMANDS = {
    handleCommand(args, received) {
        if (args && args[0] === "help") {
            HELP_COMMANDS.help("cc", received);
            return;
        }

        let userId = received.author.id;
        let username = received.author.username;

        switch (args[0]) {
            case "pay":
                this.payUser(userId, username, args.slice(1), received);
                return;
            case "balance":
                this.displayBalance(userId, username, received);
                return;
            case "steal":

                return;
        }
    },
    displayBalance(userId, username, received) {
        let balance = getBalance(userId);
        let message = `${EMOJI_MONEY} ${username} has ${balance} ${formatCurrency(balance)}`;
        received.channel.send(message);
    },
    payUser(userId, username, args, received) {
        if (args[0] && args[1]) {
            let receiverId = args[0];

            if (receiverId.match(/<@![0-9]+>/) === null) {
                received.channel.send("Invalid format to send.");
                HELP_COMMANDS.help("cc", received);
                return;
            } else {
                receiverId = receiverId.match(/<@!([0-9]+)>/)[1];
            }

            let amount = Math.round(args[1] * 100) / 100;
            pay(userId, receiverId, amount)
                .then(data => {
                    received.channel.send(`${EMOJI_DOLLAR} ${username} has sent <@!${receiverId}> ${EMOJI_MONEY_WINGS}${amount} ${formatCurrency(amount)}`);
                })
                .catch(error => {
                    received.channel.send(error);
                });
        } else {
            received.channel.send("Invalid format to send.");
            HELP_COMMANDS.help("cc", received);
        }
    }
}

function openAccount(userId) {
    try {
        let user = bank.getData(`/accounts/${userId}`);
        return user;
    } catch (err) {
        bank.push('/accounts/' + userId, {
            balance: 1000
        });
        return bank.getData(`/accounts/${userId}`);
    }
}

function getBalance(userId) {
    try {
        let user = bank.getData(`/accounts/${userId}`);
        let balance = user.balance;
        return balance;
    } catch (err) {
        return openAccount(userId).balance;
    }
}

async function pay(senderId, receiverId, amount) {
    let sender, receiver;
    try {
        sender = bank.getData(`/accounts/${senderId}`);
    } catch (err) {
        sender = openAccount(senderId);
    }

    try {
        receiver = bank.getData(`/accounts/${receiverId}`);
    } catch (err) {
        receiver = openAccount(receiverId);
    }

    if (amount < 0) {
        return Promise.reject(`You cannot send negative ${formatCurrency(0)}`);
    }

    if (sender.balance >= amount) {
        bank.push(`/accounts/${senderId}/balance`, sender.balance - amount);
        bank.push(`/accounts/${receiverId}/balance`, receiver.balance + amount);
        return {
            "success": true,
            "amount": amount
        };
    } else {
        let balance = sender.balance;
        return Promise.reject(`${EMOJI_MONEY_MOUTH} You don't have enough in your account to send ${amount} ${formatCurrency(amount)}\n Your current balance is: ${balance} ${formatCurrency(balance)}`);
    }
}

function formatCurrency(amount) {
    return `${CURRENCY}${amount !== 1 ? "s" : ""}`;
}

module.exports = CURRENCY_COMMANDS;