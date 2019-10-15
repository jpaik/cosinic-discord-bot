var HELP_COMMANDS = {
    help(args, received) {
        if (args.length > 0) {
            let help_text = '';
            switch (args.join(' ')) {
                case 'lolstats':
                    help_text = "You can use this command like: `!lolstats [SUMMONER_USERNAME]`";
                    break;
                case 'stock':
                    help_text = "You can use this command like: `!stock [TICKER] [info|NUM_MONTHS]`";
                    break;
                case 'redsched':
                    help_text = `You can use this command like: \`!redsched [SUBREDDIT] [stop|now|time in HH: MM format 24 hour standard(multiple times separated by commas)] [hot|top|rising]\`.
                    \nE.G: \`!redsched funny 17:00 top\` will post the top reddit post from /r/funny at 5:00PM EST daily.
                    \nE.G: \`!redsched funny now top\` will post the top reddit post instantly.`;
                    break;
                case 'weather':
                    help_text = "You can use this command like: `!weather [CITY_NAME]`"
                    break;
                default:
                    break;
            }
            received.channel.send(help_text);
        } else {
            received.channel.send("I'm not sure what you need help with. Try `!help [topic]`")
        }
    }
}

module.exports = HELP_COMMANDS;