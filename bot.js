const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fs = require('fs');

const Terminal = require('./Terminal');
const Constants = require('./constants');
const torrent_main = require('./torrent_search/torrent_main');
const permission = require('./permissions/permission_main');
const admin_main = require('./admin/admin_main');

const bot = new TelegramBot(Constants.TOKEN, {polling: true});



var users = {};

var history = {};

try {
    const file = fs.readFileSync('simple_history.json');
    history = JSON.parse(file.toString());
    console.log("history is read");
} catch (error) {
    console.log("failed to read history");
    console.error(error);
}


var logger = function(msg){
    if(Constants.USE_LOGGER) {
        console.log(Terminal.COLOURS.BrownOrange + "Log @" + new Date() + " From " + Terminal.COLOURS.Cyan + msg.from.first_name + Terminal.COLOURS.BrownOrange + " || " + Terminal.COLOURS.Cyan + msg.from.username + Terminal.COLOURS.BrownOrange + " (" + msg.from.id + ")\n" + "\tChat: " + Terminal.COLOURS.LightPurple + msg.chat.title + Terminal.COLOURS.BrownOrange + " || " + msg.chat.type + " (" + msg.chat.id + ")\n" + "Query: " + Terminal.COLOURS.Green + msg.text.replace(Constants.BOT_NAME, '') + Terminal.COLOURS.NC + "\n----------------------------------------------------------");

        if (msg.chat.id !== Constants.LOGGING_CHANNEL) {
            //temp = new Date() + " From <i>" + msg.from.first_name + "</i> || <i>" + msg.from.username + "</i> (" + msg.from.id + ")<pre>\n" + "\tChat: </pre><b>" + msg.chat.title + "</b><pre> || " + msg.chat.type +" (" + msg.chat.id + ")" + "\nQuery: </pre><b>" + msg.text.replace(Constants.BOT_NAME,'') + "</b>"
            bot.sendMessage(Constants.LOGGING_CHANNEL, "<pre>" + new Date() + "</pre> <i>" + msg.from.first_name + "</i> || <i>" + msg.from.username + "</i> (" + msg.from.id + ")" + " ------> <b>" + msg.chat.title + "</b> || " + msg.chat.type + " (" + msg.chat.id + ")" + "<pre>\n" + msg.text.replace(Constants.BOT_NAME, '') + "</pre>", {parse_mode: "HTML"});
        }
    }
};

var help_main = function(current_chat){
    bot.sendMessage(current_chat, Constants.HELP_PAGE_MAIN, {parse_mode : "HTML"});
};

var deal_with_message = function(msg){
    if (msg.text.includes(Constants.BOT_NAME)) {

        if (msg.text.length <= 90){
            let user_id = msg.from.id;
            //check if text message is properly formatted
            let user_name = msg.from.first_name;
            let current_chat = msg.chat.id;

            logger(msg);


            var input_array = msg.text.replace(Constants.BOT_NAME,'').split(/(\s+)/).filter( e => e.trim().length > 0);
            temp = input_array.shift(); //gets which command to run
            //console.log("main menu option= ",temp);

            switch (temp) {
                case "-t":
                    if(permission.check_permissions(user_id,"-t", current_chat, user_name, bot)){
                        torrent_main.tmain({
                            user_id:user_id,
                            user_name:user_name,
                            current_chat:current_chat,
                            users:users,
                            input_array: input_array,
                            bot: bot
                        });
                    }
                    break;
                case "-p":
                    if(permission.check_permissions(user_id,"-p", current_chat, user_name, bot)) {
                        permission.permission_main({
                            user_id:user_id,
                            user_name:user_name,
                            current_chat:current_chat,
                            users:users,
                            input_array: input_array,
                            bot: bot
                        });
                    }
                    break;
                case "-a":
                    if(permission.check_permissions(user_id,"-a", current_chat, user_name, bot)) {
                        if(msg.reply_to_message){
                            user_id = msg.reply_to_message.from.id;
                        }else{
                            user_id = false;
                        }

                        admin_main.admin_main({
                            user_id:user_id,
                            user_name:user_name,
                            current_chat:current_chat,
                            users:users,
                            input_array: input_array,
                            bot: bot
                        });
                    }
                    break;    
                case "-p_ask":
                    if(permission.check_permissions(user_id,"-p_ask", current_chat, user_name, bot)) {
                        permission.request_permission(user_name,user_id,bot,current_chat, input_array.shift());
                    }
                    break;
                case "-h":
                    if(permission.check_permissions(user_id,"-h", current_chat, user_name, bot)) {
                        help_main(current_chat);
                    }
                    break;
                case "pinned":
                    if(permission.check_permissions(user_id,"pinned", current_chat, user_name, bot)) {
                        bot.forwardMessage(current_chat,Constants.YOUTUBE_CHANNEL,Constants.YOUTUBE_CHANNEL_PINNED_MSG_ID);
                    }
                    break;
                case "whois":
                    if(permission.check_permissions(user_id,"whois", current_chat, user_name, bot)) {
                        if(msg.reply_to_message){
                            permission.whois(bot, current_chat, msg.reply_to_message.from.id);
                        }else{
                            permission.whois(bot, current_chat, input_array.shift());                    
                        }
                    }
                    break;
                default:
                    console.log("default statement do nothing");
            }

            //console.log(users);

        }else{
            bot.sendMessage(current_chat, "<b>"+user_name+" that query is too long what are you trying to do you smelly teapot?</b>", {parse_mode : "HTML"});
        }


    }else{

        if(msg.text[0] === '/'){
            user_slash_functions(msg);
        }


    }
};

var check_user_ban = (msg) => {
    let ban_words = [ "hack", "hax", "whatsapp", "invest", "trading", "money", "crypto", "forex", "hak" ];

    let banned_words_used = 0;
    let message_forwarded = 0;
    let message_has_photo = 0;
    let message_has_urls = 0;
    let user_posted_messages = get_messages_count_for_user(msg);
    //check ban words
    if(msg.text){
        let text = msg.text.toLowerCase();
        for(let i=0; i<ban_words.length; i++){
            if(text.includes(ban_words[i])){
                banned_words_used++;
            }
        }
    }


    //check if message is forwarded
    if(msg.forward_from){
        message_forwarded = 1;
    }

    //check if message is an image
    if(msg.photo){
        message_has_photo = 1;
    }

    //check if message has url
    if(msg.entities){
        for(x in msg.entities){
            if(msg.entities[x].type === 'url'){
                message_has_urls++;
            }
        }
    }

    const banned_words_used_weight = 60;
    const message_forwarded_weight = 30;
    const message_has_photo_weight = 30;
    const message_has_urls_weight = 30;

    //heavy penealty for new users
    let user_posts_score = 70;
    if(user_posted_messages < 3){
        let triggers = 0;
        if(message_forwarded === 1){
            //user_posts_score = user_posts_score * message_has_urls_weight;
            triggers++;
        }
        if(message_has_photo === 1){
            //user_posts_score = user_posts_score * message_has_photo_weight;
            triggers++;
        }
        if(message_has_urls >= 1){
            //user_posts_score = user_posts_score * message_has_urls_weight * message_has_urls;
            triggers++;
        }
        if(banned_words_used >= 1){
            //user_posts_score = user_posts_score * banned_words_used * banned_words_used_weight;
            triggers+=1;
        }
        user_posts_score = 100 + (161*triggers);
    }


    let score = (banned_words_used * banned_words_used_weight) + (message_forwarded * message_forwarded_weight) + (message_has_photo * message_has_photo_weight) + (message_has_urls * message_has_urls_weight) + user_posts_score;

    let severity_category = 0;
    let severity_text = "";

    if(score <= 100){
        //safe
    }else if(score > 100 && score <= 130){
        //potential ban
        severity_category = 1;
        severity_text = "Most likely a false positive (severity 1)";
    }else if(score > 130 && score <= 160){
        //probable ban
        severity_category = 2;
        severity_text = "Something strange is happening (severity 2)";
    }else if(score > 160 && score <= 190){
        //almost certain ban
        severity_category = 3;
        severity_text = "Ok what is this? (severity 3)";
    }else{
        //total ban
        severity_category = 4;
        severity_text = "Hmmmmmmmmmmmmmmmmmmmmmmmmmmmmm (severity 4)";
    }

    // console.log("########################## check user ban #######################");
    // console.log("banned_words_used: ",banned_words_used);
    // console.log("message_forwarded: ",message_forwarded);
    // console.log("message_has_photo: ",message_has_photo);
    // console.log("message_has_urls: ",message_has_urls);
    // console.log("user_posted_messages: ",user_posted_messages);
    // console.log("score: ",score);
    // console.log("severity_category: ", severity_category);
    // console.log("########################## check user ban #######################");


    if(severity_category > 0){
        var options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'ban', callback_data:""+msg.from.id+" ban"},{text: 'delete', callback_data:""+msg.message_id+" deletem"},{text: 'delete this', callback_data:""+msg.message_id+" delete"}]
                ]
            }),
            parse_mode: "HTML",
            disable_web_page_preview:true,
            reply_to_message_id: msg.message_id
        };

        bot.sendMessage(msg.chat.id,
            "@Terminal_Heat_Sink bot experiment triggered "+
            "<pre>\n</pre>"+
            severity_text+
            "<pre>\n</pre>"+
            "<b>Do not worry this doesnt ban anyone just an experiment</b>"+
            "<pre>\n\n"+
            "score="+score+"\n"+
            "cat="+severity_category+"\n"+
            "bwu="+banned_words_used+"\n"+
            "mf="+message_forwarded+"\n"+
            "mhp="+message_has_photo+"\n"+
            "mhu="+message_has_urls+"\n"+
            "upm="+user_posted_messages+"\n\n"+
            "user_id="+msg.from.id+"\n" +
            "user_name="+msg.from.username+"\n" +
            "text=: "+ msg.text +
            "</pre>",
            options);
    }


};


var user_slash_functions = (msg) =>{
    if(msg.reply_to_message && msg.text.toLowerCase().startsWith("/report")){
        var options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'ban', callback_data:""+msg.reply_to_message.from.id+" ban"},{text: 'delete', callback_data:""+msg.reply_to_message.message_id+" deletem"},{text: 'delete report', callback_data:""+msg.message_id+" deletem"}],
                    [{text: 'delete this', callback_data:""+msg.reply_to_message.message_id+" delete"}]
                ]
            }),
            parse_mode: "HTML",
            disable_web_page_preview:true,
            reply_to_message_id: msg.reply_to_message.message_id
        };

        bot.sendMessage(msg.chat.id,
            //"<pre>\n______________________________\n</pre>"+
            "@Terminal_Heat_Sink Report submitted for<pre>" + " \n" +
            "user_id="+msg.reply_to_message.from.id+"\n" +
            "user_name="+msg.reply_to_message.from.username+"\n\n" +
            "report by="+ msg.from.id + "\n" +
            "user_name=="+ msg.from.username+ "\n"+
            "</pre>"+"Reason: "+ msg.text.toLowerCase().split("/report")[1],
            options);
    }else if(msg.text.toLowerCase().startsWith("/donate")){
        bot.sendMessage(msg.chat.id,Constants.DONATE,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/notes")){
        bot.sendMessage(msg.chat.id,Constants.NOTES,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/all")){
        //bot.sendMessage(msg.chat.id,Constants.NOTES,{parse_mode: "HTML", disable_web_page_preview:true,});
        bot.forwardMessage(msg.chat.id,Constants.YOUTUBE_CHANNEL,Constants.YOUTUBE_CHANNEL_PINNED_MSG_ID);
    }else if(msg.text.toLowerCase().startsWith("/rogphone2rgb")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_ROGPHONE2RGB,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/rogphone2")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_ROG_PHONE_2_GUIDES,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/raw")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_RAW,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/relock")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_RELOCK,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/apps")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_APPS,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/psvita")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_PSVITA,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/qmk")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_QMK,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/edxposed")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_Edxposed,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/lineage")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_LINEAGE,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/flasher")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_FLASHING_SCRIPT,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/root")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_ROOT,{parse_mode: "HTML", disable_web_page_preview:true,});
    }else if(msg.text.toLowerCase().startsWith("/cts-profile")){
        bot.sendMessage(msg.chat.id,Constants.NOTES_CTS,{parse_mode: "HTML", disable_web_page_preview:true,});
    }

};

var deal_with_new_member = function(msg){
    chat_id = msg.chat.id;
    user_id = msg.new_chat_members[0].id;
    username = msg.new_chat_members[0].username || msg.new_chat_members[0].first_name;
    chat_title = msg.chat.title;
    //console.log(chat_id, " ", user_id, " ", username, " ", chat_title);
    //if(parseInt(chat_id) === Constants.YOUTUBE_CHANNEL) {
        bot.deleteMessage(chat_id,msg.message_id);

        var options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'MSM', url: 'https://t.me/msmrog2support'},{text: 'OMNI', url: 'https://t.me/omnirog2'},{text: 'ROG GLOBAL', url: 'https://t.me/ROGPhoneSeriesDiscussion'}],
                    [{ text: 'Notes', callback_data:""+user_id+" notes"},{ text: 'Donate', callback_data:""+user_id+" donate"}]
                ]
            }),
            parse_mode: "HTML",
            disable_web_page_preview:true
        };

        bot.sendMessage(chat_id, "<b>" + username +" (" + user_id + ")"  + " Welcome to " + chat_title + "</b>"+
            //"<pre>\n______________________________\n</pre>"+
            "<pre>" +
            "\n"+
            "    _______ _    _  _____ \n" +
            "   |__   __| |  | |/ ____|\n" +
            "      | |  | |__| | (___  \n" +
            "      | |  |  __  |\\___ \\ \n" +
            "      | |  | |  | |____) |\n" +
            "      |_|  |_|  |_|_____/ \n" +
            "                          \n" +
            "</pre>"+
            "<b>Click on the Notes bellow or type <pre>/notes</pre> for all guides, links to downloads and so on. It should have everything you need :) </b>",
            options); // last argument to diable link previews https://core.telegram.org/bots/api#sendmessage
    // }else{
    //     bot.deleteMessage(chat_id,msg.message_id);
    //     bot.sendMessage(chat_id, "<b>" + username +" (" + user_id + ")" + " Welcome to " + chat_title + "</b>"+
    //         //"<pre>\n______________________________\n</pre>"+
    //         "<pre>" +
    //         "\n" +
    //         "    _    _ _____ \n" +
    //         "   | |  | |_   _|\n" +
    //         "   | |__| | | |  \n" +
    //         "   |  __  | | |  \n" +
    //         "   | |  | |_| |_ \n" +
    //         "   |_|  |_|_____|\n"+
    //         "</pre>",
    //         {parse_mode: "HTML", disable_web_page_preview:true}); // last argument to diable link previews https://core.telegram.org/bots/api#sendmessage
    // }
};

// bot.on('new_chat_members', (ctx) => {
// });

var history_update = (msg) =>{
    if (Object.keys(history).includes(msg.chat.id.toString())){
        //check user
        if(Object.keys(history[msg.chat.id.toString()]).includes(msg.from.id.toString())){
            // increase history count
            history[msg.chat.id.toString()][msg.from.id.toString()] = history[msg.chat.id.toString()][msg.from.id.toString()] + 1;
        }else{
            //new user
            history[msg.chat.id.toString()][msg.from.id.toString()] = 0;
        }
    }else{
        //create new group
        history[msg.chat.id.toString()] = {};
        history[msg.chat.id.toString()][msg.from.id.toString()] = 0
    }
};

var get_messages_count_for_user = (msg) => {
    if (Object.keys(history).includes(msg.chat.id.toString())){
        if(Object.keys(history[msg.chat.id.toString()]).includes(msg.from.id.toString())){
            return history[msg.chat.id.toString()][msg.from.id.toString()];
        }else{
            return 0;
        }
    }else{
        return 0;
    }
};


bot.on('message', (msg) => {
    //console.log(msg);

    history_update(msg);
    //console.log("######### messages_count_for user: ", get_messages_count_for_user(msg));

    if(msg.text){
        deal_with_message(msg);
    }else if(msg.new_chat_members){
        deal_with_new_member(msg);
    }else if(msg.left_chat_member){
        bot.deleteMessage(msg.chat.id,msg.message_id);
        bot.sendMessage(msg.chat.id,
            "<pre>User left: " + msg.left_chat_member.username + " " + msg.left_chat_member.first_name + " " + msg.left_chat_member.last_name + " (" + msg.left_chat_member.id + ")" + "</pre>",
            {parse_mode: "HTML", disable_web_page_preview:true}); // last argument to diable link previews https://core.telegram.org/bots/api#sendmessage
    }

    check_user_ban(msg);

   //
});

bot.on('callback_query', (callbackQuery) => {
    //console.log(callbackQuery);

    const action = callbackQuery.data;
    let user_id = parseInt(callbackQuery.from.id);
    let user_name = callbackQuery.from.username;

    let intended_for_user_id = parseInt(action.split(" ")[0]);
    let type_of_action = action.split(" ")[1];

    //admin actions
    if(permission.check_permissions(user_id,"-a", callbackQuery.message.chat.id, user_name, bot)) {
        switch (type_of_action){
            case "test":
                var options = {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'delete', callback_data:""+user_id+" delete"}]
                        ]
                    }),
                    parse_mode: "HTML",
                    disable_web_page_preview:true
                };
                let intended = intended_for_user_id === user_id ? " Yes" : " No";
                bot.sendMessage(callbackQuery.message.chat.id,
                    //"<pre>\n______________________________\n</pre>"+
                    "<pre>" + "callback response \n" +
                    "data="+action+" \n" +
                    "user_id="+user_id+"\n" +
                    "user_name="+user_name+"\n" +
                    "intended for this user: "+ intended +
                    "</pre>",
                    options);
                break;
            case "delete":
                bot.deleteMessage(callbackQuery.message.chat.id,callbackQuery.message.message_id);
                break;
            case "deletem":
                bot.deleteMessage(callbackQuery.message.chat.id,intended_for_user_id);
                break;
            case "ban":
                admin_main.ban(bot,callbackQuery.message.chat.id,callbackQuery);
                break;
            case "unban":
                admin_main.unban(bot,callbackQuery.message.chat.id,intended_for_user_id);
                break;
            default:
                break;
        }
    }else{
        //for normal users
        switch (type_of_action){
            case "notes":
                bot.sendMessage(callbackQuery.message.chat.id,Constants.NOTES,{parse_mode: "HTML", disable_web_page_preview:true,});
                break;
            case "donate":
                bot.sendMessage(callbackQuery.message.chat.id,Constants.DONATE,{parse_mode: "HTML", disable_web_page_preview:true,});
                break;
            default:
                break;
        }
    }






    // bot.sendMessage(msg.chat.id,
    //     //"<pre>\n______________________________\n</pre>"+
    //     "<pre>" + "callback response \n" +
    //     "data="+action+" \n" +
    //     "user_id="+user_id+"\n" +
    //     "user_name="+user_name+"\n" +
    //     "</pre>",
    //     {parse_mode: "HTML", disable_web_page_preview:true});


    bot.answerCallbackQuery(callbackQuery.id);
});



bot.on('polling_error', (error) => {
    if( error.code ){
        if(error.code !== 'EFATAL'){
            console.log("error code: ", error);
        }
    }else{
        console.log("error code: ", error);
    }
});


function exitHandler(options, exitCode) {
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit){
        console.log("needs to exit");
        console.log("history\n");
        console.log(JSON.stringify(history));

        try {
            fs.writeFileSync('simple_history.json', JSON.stringify(history));
            console.log("JSON data is saved.");
        } catch (error) {
            console.log("failed to save history");
            console.error(error);
        }

        process.exit();
    }

}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
