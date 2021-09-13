#!/usr/bin/env node
import chalk from 'chalk';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear.js'
import _ from 'lodash';
import { program } from 'commander';
import { LowSync, JSONFileSync } from 'lowdb';
import Table from 'tty-table';

dayjs.extend(weekOfYear)

const file = `${process.env.HOME}/temp/tdata.json`
const db = new LowSync(new JSONFileSync(file))

function calcProfit (transactions) {
  const { buy: buyGroup = [], sell: sellGroup = [] } = _.groupBy(transactions, (t) => t.type)

  const buySum = buyGroup.reduce((sum, curr) => {
      return sum + curr.price * curr.amount
    }, 0)

  const sellSum = sellGroup.reduce((sum, curr) => {
    return sum + curr.price * curr.amount
  }, 0)

  const fee = (sellSum + buySum) * 2 / 10000 + sellSum / 1000
  const profit = _.round(sellSum - buySum - fee, 2)

  return profit
}

program.version('1.0.0');

program
  .command('sell <amount> <price>')
  .alias('s')
  .description('Sell stocks')
  .action((amount, price) => {
    const date = dayjs().format('YYYY-MM-DD')
    const newRecord = {
      type: 'sell', amount: Number(amount), price: Number(price), date, week: dayjs().week(), month: dayjs().month()
    }
    db.read()
    db.data = db.data || []
    db.data.push(newRecord)
    db.write()

    console.log(chalk.bold.green('成功写入卖出记录！'))
  })

program
  .command('buy <amount> <price>')
  .alias('b')
  .description('Buy stocks')
  .action((amount, price) => {
    const date = dayjs().format('YYYY-MM-DD')
    const newRecord = {
      type: 'buy', amount: Number(amount), price: Number(price), date, week: dayjs().week(), month: dayjs().month()
    }
    db.read()
    db.data = db.data || []
    db.data.push(newRecord)
    db.write()

    console.log(chalk.bold.green('成功写入买入记录！'))
  })

program
  .command('calc')
  .alias('c')
  .description('Calc revenue')
  .option('-t, --today')
  .option('-w, --week')
  .option('-a, --all')
  .action((options) => {
    if (options.today) {
      db.read()
      const transactions = (db.data || []).filter((d) => d.date === dayjs().format('YYYY-MM-DD'))
      const profit = calcProfit(transactions)
      console.log(chalk.red(`今日利润：${profit}`))
    }
    if (options.week) {
      db.read()
      const transactions = (db.data || []).filter((d) => d.week === dayjs().week())
      const profit = calcProfit(transactions)
      console.log(chalk.red(`本周利润：${profit}`))
    }
    if (options.all) {
      db.read()
      const transactions = db.data || []
      const profit = calcProfit(transactions)
      console.log(chalk.red(`合计利润：${profit}`))
    }
  })

program
  .command('list')
  .alias('l')
  .description('Show transction records')
  .action(() => {
    const header = [
      { value: 'date' },
      { value: 'type' },
      { value: 'price' },
      { value: 'amount' },
    ]

    db.read()
    const rows = db.data

    const output = Table(header, rows).render()
    console.log(output)
  })

program.parse(process.argv)
