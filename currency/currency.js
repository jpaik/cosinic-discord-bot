require('dotenv').config();
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;
var cron = require('node-cron');

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
 * * * userId {
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

        if (process.env.NODE_ENV === "DEVELOPMENT") {
            received.channel.send(`NOTE: I'm currently running on development. Devs are testing, so anything you do right now will not be counted.`);
        }

        switch (args[0]) {
            case "pay":
            case "send":
                this.payUser(userId, username, args.slice(1), received);
                return;
            case "botbalance":
            case "bank":
                this.displayBalance(client.user.id, client.user.username, received);
                return;
            case "economy":
                this.displayAverageEconomy(received);
                return;
            case "balance":
                this.displayBalance(userId, username, received);
                return;
            case "steal":
                return;
            case "roulette":
                CURRENCY_GAMES.handleCommand(args, received);
                return;
        }
    },
    displayBalance(userId, username, received) {
        let balance = getBalance(userId);
        let message = `${EMOJI_MONEY} ${username} has ${balance} ${formatCurrency(balance)}`;
        received.channel.send(message);
    },
    displayAverageEconomy(received) {
        let avgEcon = sanitizeAmount(getAverageEconomy());
        let message = `${EMOJI_DOLLAR} The average economy is: ${avgEcon} ${formatCurrency(avgEcon)}`;
        received.channel.send(message);
    },
    payUser(userId, username, args, received) {
        if (args[0] && args[1]) {
            let receiverId = args[0];

            if (receiverId.match(/<@!?[0-9]+>/) === null) {
                received.channel.send("Invalid send format.");
                HELP_COMMANDS.help("cc", received);
                return;
            } else {
                receiverId = receiverId.match(/<@!?([0-9]+)>/)[1];
            }

            let amount = Math.round(args[1] * 100) / 100;
            amount = sanitizeAmount(amount);
            pay(userId, receiverId, amount)
                .then(data => {
                    let message = `${EMOJI_MONEY}  ${username}  ${EMOJI_DOLLAR}:arrow_right:  <@${receiverId}> ${EMOJI_MONEY_WINGS} ${data.amount} ${formatCurrency(data.amount)}`;
                    //message += `\n        New balance: ${data.senderBalance} ${formatCurrency(data.senderBalance)}`;
                    received.channel.send(message);
                })
                .catch(error => {
                    received.channel.send(error);
                });
        } else {
            received.channel.send("Invalid send format.");
            HELP_COMMANDS.help("cc", received);
        }
    },
    getRawBalance(userId) {
        return getBalance(userId);
    },
    depositToUser(userId, amount) {
        amount = sanitizeAmount(amount);
        return deposit(userId, amount);
    },
    withdrawFromUser(userId, amount) {
        amount = sanitizeAmount(amount);
        return withdraw(userId, amount);
    },
    depositToBot(amount) {
        amount = sanitizeAmount(amount);
        return deposit(client.user.id, amount);
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

async function deposit(userId, amount) {
    try {
        amount = sanitizeAmount(amount);
        let user = bank.getData(`/accounts/${userId}`);
        let balance = user.balance;
        bank.push(`/accounts/${userId}/balance`, sanitizeAmount(balance + amount));
        return Promise.resolve(sanitizeAmount(balance + amount));
    } catch (err) {
        amount = sanitizeAmount(amount);
        let balance = openAccount(userId).balance;
        bank.push(`/accounts/${userId}/balance`, sanitizeAmount(balance + amount));
        return Promise.resolve(sanitizeAmount(balance + amount));
    }
}

async function withdraw(userId, amount) {
    try {
        amount = sanitizeAmount(amount);
        let user = bank.getData(`/accounts/${userId}`);
        let balance = user.balance;
        if (balance - amount < 0) {
            return Promise.reject('Not enough balance in account');
        }
        bank.push(`/accounts/${userId}/balance`, sanitizeAmount(balance - amount));
        return Promise.resolve(sanitizeAmount(balance - amount));
    } catch (err) {
        amount = sanitizeAmount(amount);
        let balance = openAccount(userId).balance;
        bank.push(`/accounts/${userId}/balance`, sanitizeAmount(balance - amount));
        return Promise.resolve(sanitizeAmount(balance - amount));
    }
}

async function pay(senderId, receiverId, amount) {
    let sender, receiver;
    amount = sanitizeAmount(amount);

    if (senderId === receiverId) {
        return Promise.reject(`You cannot send ${formatCurrency(0)} to yourself :open_mouth::point_right:   :point_left::hushed:`);
    }
    if (amount < 0) {
        return Promise.reject(`You cannot send negative ${formatCurrency(0)}`);
    }
    if (amount === 0) {
        return Promise.reject(`You cannot send 0 ${formatCurrency(0)}`);
    }
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
    try {
        await withdraw(senderId, amount);
        await deposit(receiverId, amount);
        return Promise.resolve({
            "success": true,
            "amount": amount,
            "senderBalance": sender.balance - amount
        });
    } catch (err) {
        let balance = sender.balance;
        return Promise.reject(`${EMOJI_MONEY_MOUTH} You don't have enough in your account to send ${amount} ${formatCurrency(amount)}`);
    }
}

function sanitizeAmount(amount) {
    if (amount > Number.MAX_SAFE_INTEGER) {
        return 0;
    }
    if ((amount % (!isNaN(parseFloat(amount))) >= 0) && 0 <= ~~amount) {
        return Math.round(amount * 100) / 100;
    }
    return 0;
}

function formatCurrency(amount) {
    return `${CURRENCY}${amount !== 1 ? "s" : ""}`;
}

/**
 * 
 * Name courtesy from Sam (Skeltch) & Andrew Yang
 * 
 */
function freedomDividend(accounts) {
    let bank_balance = getBalance(client.user.id);
    let distributionAmount = sanitizeAmount(bank_balance * 0.3); // 30% of bank wealth gets distributed equally to everyone
    withdraw(client.user.id, distributionAmount);
    let dividends = sanitizeAmount(distributionAmount / accounts.length);

    const delay = ms => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    const delayMessage = (time, cb) => {
        time = time || 300;
        return delay(5000).then(() => {
            cb();
        });
    }
    const depositDividends = async _ => {
        for (let index = 0; index < accounts.length; index++) {
            deposit(accounts[index], dividends);

            let delay = 300;
            if ((index + 1 % 3) === 0) { // For Discord Chat Rate Limit
                delay = 5000;
            }
            await delayMessage(delay, () => {
                client.users.get(accounts[index]).send(`${EMOJI_MONEY} You have been given freedom dividends of ${dividends} ${formatCurrency(dividends)}!`);
            });
        }
    }

    depositDividends();

}

function economyStamps(accounts) {
    let bank_balance = getBalance(client.user.id);
    let distributionAmount = sanitizeAmount(bank_balance * 0.15); // 15% of bank goes to the poverty before freedom dividends
    withdraw(client.user.id, distributionAmount);
    let distributed_per_person = sanitizeAmount(distributionAmount / accounts.length);
    accounts.forEach(id => {
        deposit(id, distributed_per_person);
        client.users.get(id).send(`${EMOJI_MONEY} You have been given economy stamps of ${distributed_per_person} ${formatCurrency(distributed_per_person)}!`);
    });
}

function getAverageEconomy() {
    let bot_id = client.user.id;
    try {
        let accounts = bank.getData('/accounts');
        let population = Object.keys(accounts).length;
        let avg = Object.keys(accounts).reduce((sum, id) => {
            if (id === bot_id) { // Don't count the bot balance
                population--;
                return sum;
            } else {
                return sum + accounts[id].balance
            }
        }, 0) / population;
        return avg;
    } catch (err) {
        return 0;
    }
}

function checkEconomy() {
    try {
        let bot_id = client.user.id;
        let accounts = bank.getData('/accounts');
        let avgEcon = getAverageEconomy();

        let toDonate = [];
        let toDividends = [];
        for (let id in accounts) {
            if (id !== bot_id) {
                if (accounts[id].balance < (avgEcon / 2)) { // If the user's balance is below 50% of the average economy
                    toDonate.push(id); // Then put them on the donor list
                }
                toDividends.push(id); // Freedom dividends for everyone
            }
        }

        if (toDonate.length) {
            economyStamps(toDonate);
        }

        if (toDividends.length) {
            freedomDividend(toDividends);
        }

    } catch (error) {
        console.error(error);
    }
}

// Run every hour
cron.schedule('0 * * * *', () => {
    checkEconomy();
}, {
    timezone: "America/New_York"
});

module.exports = CURRENCY_COMMANDS;
var CURRENCY_GAMES = require('./games.js');