/////////////////////////////
//          Modules        //
/////////////////////////////

const fs = require('fs');
const util = require('util');

/////////////////////////////
//           Quote         //
/////////////////////////////

// 載入指令表
const QUOTE_FILENAME = 'quote.json';
let quotedatas = require("./" + QUOTE_FILENAME);

function getUsage(command) {
  return "你輸入的指令有錯誤，不過作者還沒寫文件 (诶?";
}

function userTagToUserId(userTag) {
	return userTag.match(/^<@!?(\d+)>$/, "")[0];
}

function isUserTag(userTag) {
	if (/^<@!?\d+>$/.test(userTag)) return true;
	else return false;
}

function usernameToUserId(username, members) {
  for (let collection_snowflake_guildmember of members) {
    let id = collection_snowflake_guildmember[0];
    let guildmember = collection_snowflake_guildmember[1];
    if (username === guildmember.displayName) return id;
  }
  return null;
}

function getUserDisplayNameWithUserId(userId, members) {
  for (let collection_snowflake_guildmember of members) {
    let id = collection_snowflake_guildmember[0];
    let guildmember = collection_snowflake_guildmember[1];
    if (id === userId) return guildmember.displayName;
  }
  return null;
}

function quoteFormat(quote, speaker, timestamp) {
  let d = new Date(timestamp);
  return `"${quote}" - ${speaker}(${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()})`;
}

class Quote {
  constructor(register) {
    this.register = register;
    register.registEvent('exit', this.exitHandle.bind(this));
    register.registCommand('!quote', this.quoteHandle.bind(this));
  }
  
  quoteHandle(message, ...args) {
    // 防呆
    if (args[2] === "") args.splice(2, 1);
    //
    let field_user = args[1];
    let field_method = args[2];
    let field_quote = args.slice(3).join(' ');
    let field_quoteId;
    let quoteId;
    let userId;
    let userDisplayname = null;
    //
    if (isUserTag(field_user)) {
      userId = field_user.match(/^<@!?(\d+)>$/)[1];
      userDisplayname = getUserDisplayNameWithUserId(userId, message.guild.members);
    }
    else {
      // assume it's username
      userId = usernameToUserId(field_user, message.guild.members);
      userDisplayname = field_user;
    }
    if (userId === null || userDisplayname === null) {
      message.reply(`無法找到使用者 ${field_user}`);
      return;
    }
    // initialized
    if (!(userId in quotedatas)) quotedatas[userId] = { content: [] }
    // quote
    let quotedata = quotedatas[userId];
    let quotes = quotedatas[userId].content;
    
    switch (field_method) {
      case 'a': // same as add
      case 'add':
        quotedatas[userId].content.push({
          content: field_quote, 
          timestamp: Date.now(), 
          raw: false, 
        });
        //
        message.reply(`引言「${field_quote}」添加成功`);
        break;
      case 'd': // same as delete
      case 'delete':
        field_quoteId = args[3];
        if (field_quoteId === undefined) {
          message.reply(getUsage("!quote <user> delete"));
          return;
        }
        quoteId = Number(field_quoteId);
        if (isNaN(quoteId)) {
          message.reply(`您輸入的 id (${id}) 有誤`);
          return;
        }
        //
        if (!Number.isInteger(quoteId)) {
          message.reply(`您輸入的 id (${field_quoteId}) 有誤`);
          return;
        }
        --quoteId; // to programming id
        if (quoteId < 0 || quoteId > quotes.length) {
          message.reply(`您輸入的 id (${quoteId}) 超出編號範圍(1 ~ ${quotes.length - 1})。`);
          return;
        }
        //
        message.reply(`刪除引言 \`${quoteFormat(quotes[quoteId].content, userDisplayname, quotes[quoteId].timestamp)}\`成功`);
        quotes.splice(quoteId, 1);
        break;
      case 'e': // same as edit
      case 'edit':
        break;
      case 'l': // same as list
      case 'list':
        if (quotes.length === 0) {
          message.channel.send(`${userDisplayname} 沒有任何引言`);
          return;
        }
        let response = "";
        for (let id = 0; id < quotes.length; ++id) {
          let quote = quotes[id];
          let displayId = id + 1;
          response += displayId + ": " + quoteFormat(quote.content, userDisplayname, quote.timestamp) + "\n";
        }
        message.channel.send(response);
        return;
        break;
      case 'r': // Same as random
      case 'random':
        if (quotes.length === 0) {
          message.channel.send(`${userDisplayname} 沒有任何引言`);
          return;
        }
        quoteId = Math.floor(Math.random() * quotes.length);
        let quote = quotes[quoteId];
        message.channel.send(quoteFormat(quote.content, userDisplayname, quote.timestamp));
          return;
        break;
      default:
        field_quoteId = args[2];
        quoteId = Number(field_quoteId);
        //
        if (field_quoteId === undefined) {
          message.reply(getUsage("!quote <user>"));
          return;
        }
        //
        quoteId = Number(quoteId);
        if (isNaN(quoteId)) {
          message.reply(`您輸入的 id (${field_quoteId}) 有誤`);
          return;
        }
        //
        if (Number.isInteger(quoteId)) {
          if (quotes.length === 0) {
            message.channel.send(`${userDisplayname} 沒有任何引言`);
            return;
          }
          --quoteId; // to programming id
          if (quoteId < 0 || quoteId > quotes.length) {
            message.reply(`您輸入的 id (${quoteId}) 超出編號範圍(1 ~ ${quotes.length - 1})。`);
            return;
          }
          let quote = quotes[quoteId];
          message.channel.send(quoteFormat(quote.content, userDisplayname, quote.timestamp));
          return;
        } else {
          message.reply('該 method 目前並不支援');
          return;
        }
    }
  }
  
  saveQuoteSync() {
    try {
      fs.writeFileSync("./plugins/" + QUOTE_FILENAME, JSON.stringify(quotedatas));
    } catch (e) {
      console.error("捕捉到錯誤: " + e);
    }
  }
  
  exitHandle() {
    this.saveQuoteSync();
  }
}

module.exports = Quote;
