import nodemailer from 'nodemailer';
//import { Template } from './template/mail-template.service.js';

// async..await is not allowed in global scope, must use a wrapper
export class Mail {
	// create reusable transporter object using the default SMTP transport
	constructor(template) {
		this.text = template.text();
		this.html = template.html();
		this.data = template.data;
	}

	async send(user, pass, emails) {
		// create reusable transporter object using the default SMTP transport
		let transporter = nodemailer.createTransport({
			host: 'smtp.yandex.ru',
			port: 465,
			secure: true, // true for 465, false for other ports
			auth: {
				user: user, // generated ethereal user
				pass: pass, // generated ethereal password
			},
		});

		// send mail with defined transport object
		await transporter.sendMail({
			from: `Zakupki <${user}>`, // sender address
			to: emails, // list of receivers		
			//cc: 'nikos_almeryda@mail.ru',
			subject: `Закупка ${this.data[0].number}`, // Subject line
			text: this.text, // plain text body
			html: this.html,	// html body
		});
	}
}
// const mail = new Mail(new Template(items));

//mail.send().catch(console.error);

// mail.log();

