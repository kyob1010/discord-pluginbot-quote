/////////////////////////////
//          Modules        //
/////////////////////////////

const fs = require('fs');
const util = require('util');
const path = require('path');

////////////////////////////////////////////////////////////////////////
//                             Constants                              //
////////////////////////////////////////////////////////////////////////

const QUOTE_FILENAME = 'quote.json';

/////////////////////////////
//           Quote         //
/////////////////////////////

function getUsage(command) {
  switch (command) {
  case "quote":
    return "!quote <user>";
    break;
  case "quote <user>":
    return "!quote <user> <add|delete|list|random|quote id>"
      break;
  default:
    return "你輸入的指令有錯誤，不過作者還沒寫文件 (诶?";
  }
}

function userTagToUserId(userTag) {
	return userTag.match(/^<@!?(\d+)>$/, "")[0];
}

function quoteFormat(quote, speaker, timestamp) {
  let d = new Date(timestamp);
  return `「${quote}」 - ${speaker}(${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()})`;
}

class Quote {
  constructor(register) {
    // load quotes
    try {
      this.quotedatas = require("./" + QUOTE_FILENAME);
    } catch (e) {
      throw new Error(`quote data load fail`);
    }
    //
    register.registEvent('exit', this.exitHandle.bind(this));
    register.registCommand('!quote', this.quoteHandle.bind(this));
  }

  processUserArgument(message, user) {
    let id, name;
    // test if user is a tag
    if (/^<@!?\d+>$/.test(user)) {
      id = user.match(/^<@!?(\d+)>$/)[1];
      name = message.guild.members.find(guildmember => guildmember.id == id).nickname || message.client.users.find(u => u.id == id).username;
    } else {
      // assume it's username
      let u = message.guild.members.find(guildmember => guildmember.nickname == user) || message.client.users.find(u => u.username == user);
      if (u != null) id = u.id;
      name = user;
    }
    //
    if (!id || !name) throw new Error("username process Error");
    //
    return {id, name};
  }

  quoteAddHandle(message, userId, quote) {
    this.quotedatas[userId].content.push({
      content: quote, 
      timestamp: Date.now(), 
      raw: false, 
    });
    //
    message.reply(`引言「${quote}」添加成功`);
  }

  quoteHandle(message, ...args) {
    // arguments alias
    const quotedatas = this.quotedatas;
    let field_user = args[1];
    let field_method = args[2];
    let field_quote = args.slice(3).join(' ');
    let field_quoteId;

    // 
    let quoteId;
    let userId, userDisplayName;
    //
    if (field_user == undefined) {
      message.reply(getUsage('quote'));
      return;
    }
    try {
      //
      let u = this.processUserArgument(message, field_user);
      userId = u.id;
      userDisplayName = u.name;
    } catch (e) {
      // can't find user, use raw name instead
      userId = field_user;
      userDisplayName = field_user;
    }

    // initialized
    if (!(userId in quotedatas)) quotedatas[userId] = { content: [] }
    // quote
    let quotedata = quotedatas[userId];
    let quotes = quotedatas[userId].content;
    //
    switch (field_method) {
      case 'a': // same as add
      case 'add':
        this.quoteAddHandle(message, userId, field_quote);
        break;
      case 'd': // same as delete
      case 'delete':
        if (field_quoteId === undefined) {
          message.reply(getUsage("quote <user> delete"));
          return;
        }
        try {
          quoteId = Number(field_quoteId);
        } catch(e) {
          message.reply(`${field_quoteId} 不是一個有效的數字`);
          return;
        }
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
        message.reply(`刪除引言 \`${quoteFormat(quotes[quoteId].content, userDisplayName, quotes[quoteId].timestamp)}\`成功`);
        quotes.splice(quoteId, 1);
        break;
      case 'l': // same as list
      case 'list':
        if (quotes.length === 0) {
          message.channel.send(`${userDisplayName} 沒有任何引言`);
          return;
        }
        let response = "";
        for (let id = 0; id < quotes.length; ++id) {
          let quote = quotes[id];
          let displayId = id + 1;
          response += displayId + ": " + quoteFormat(quote.content, userDisplayName, quote.timestamp) + "\n";
        }
        message.channel.send(response);
        return;
        break;
      case 'r': // Same as random
      case 'random':
        if (quotes.length === 0) {
          message.channel.send(`${userDisplayName} 沒有任何引言`);
          return;
        }
        quoteId = Math.floor(Math.random() * quotes.length);
        let quote = quotes[quoteId];
        message.channel.send(quoteFormat(quote.content, userDisplayName, quote.timestamp));
        return;
        break;
      default:
        field_quoteId = args[2];
        quoteId = Number(field_quoteId);
        //
        if (field_quoteId === undefined) {
          message.reply(getUsage("quote <user>"));
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
            message.channel.send(`${userDisplayName} 沒有任何引言`);
            return;
          }
          --quoteId; // to programming id
          if (quoteId < 0 || quoteId > quotes.length) {
            message.reply(`您輸入的 id (${quoteId}) 超出編號範圍(1 ~ ${quotes.length - 1})。`);
            return;
          }
          let quote = quotes[quoteId];
          message.channel.send(quoteFormat(quote.content, userDisplayName, quote.timestamp));
          return;
        } else {
          message.reply('該 method 目前並不支援');
          return;
        }
    }
  }
  
  saveQuoteSync() {
    fs.writeFileSync(path.join(__dirname, QUOTE_FILENAME), JSON.stringify(this.quotedatas));
  }
  
  exitHandle() {
    this.saveQuoteSync();
  }
}

module.exports = Quote;
