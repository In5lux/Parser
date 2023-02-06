const dateFormat = d => `${d.getFullYear()}-${d.getMonth().toString().length == 1 ? ('0' + (d.getMonth() + 1)) : d.getMonth()}-${d.getDate().toString().length == 1 ? ('0' + (d.getDate())) : d.getDate()}`;

const host = 'http://localhost';
const port = 3000;

var socket = io.connect();

socket.on('add mess', function (data) { });

var app = new Vue({
	el: '#app',
	data: {
		date: dateFormat(new Date()) || null,
		searchDate: dateFormat(new Date()).split('-').reverse().join('.') || null,
		customer: null,
		price: null,
		desc: null,
		lastUpdateTime: localStorage.getItem('lastUpdateTime') || null,
		status: null,
		isError: false,
		items: null,
		message: null,
		executor: null
	},
	methods: {
		parse: function () {
			if (event) {
				event.preventDefault()
			};
			this.isError = false;
			socket.emit('send mess', 'Start parsing');
			socket.on('add mess', async function (data) {
				const d = await data;
				app.status = d;
			});
			socket.on('executor', async function (data) {
				const d = await data;
				app.executor = d;
			});
			const searchParams = {
				date: this.searchDate
			}
			if (this.customer) searchParams.client = this.customer;
			fetch(host + ':' + port + '/parse?' + new URLSearchParams(searchParams).toString())
				.then(async _res => {
					//const response = await res.text();
					//this.status = response;
					this.lastUpdateTime = new Date().toLocaleString();
					localStorage.setItem('lastUpdateTime', this.lastUpdateTime);
					//console.log(this.lastUpdateTime + ' ' + this.status);
				}).catch(error => {
					this.isError = true;
					this.status = 'Нет ответа сервера';
					console.error(this.lastUpdateTime + ' ' + this.status + ' ' + error.message);
				});
		},
		search: async function () {
			this.isError = false;
			console.log(this.date);
			if (event) {
				event.preventDefault()
			}
			const searchParams = {};

			document.querySelector('.search-msg').classList.add('hide');

			if (this.desc) { searchParams.desc = this.desc }
			else if (this.customer) { searchParams.client = this.customer }
			else { searchParams.date = this.date.split('-').reverse().join('.') }

			fetch(host + ':' + port + '/search?' + new URLSearchParams(searchParams).toString(), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(async res => {
				let result = JSON.parse(await res.text());
				if (result.items) {
					this.items = result.items
					this.message = null;
				};
				if (result.message) {
					this.items = null;
					this.message = result.message;
				};
			}).catch(error => {
				this.isError = true;
				this.status = 'Нет ответа сервера';
				console.error(this.lastUpdateTime + ' ' + this.status + ' ' + error.message);
			});

			// if (this.desc) {
			// 	window.open(host + ':' + port + `/db?desc=${this.desc}`, "_self");
			// 	localStorage.removeItem('date');
			// };
			// if (this.customer) {
			// 	window.open(host + ':' + port + `/db?client=${this.customer}`, "_self");
			// 	localStorage.removeItem('date');
			// };
		},
		dateChange: function handler() {
			this.isError = false;
			this.desc = null;
			this.customer = null;
			document.querySelector('.search-msg').classList.add('hide');
			const value = event.target.value;
			this.date = value;
			localStorage.setItem('date', value);
			const date = event.target.value.split('-').reverse().join('.');
			this.searchDate = date;
			localStorage.setItem('searchDate', date);
			// window.open(host + ':' + port + `/db?date=${date}`, "_self");

			fetch(`${host}:${port}/search?date=${date}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(async res => {
				let result = JSON.parse(await res.text());
				if (result.items) {
					this.items = result.items
					this.message = null;
				};
				if (result.message) {
					this.items = null;
					this.message = result.message;
				};
			}).catch(error => {
				this.isError = true;
				this.status = 'Нет ответа сервера';
				console.error(this.lastUpdateTime + ' ' + this.status + ' ' + error.message);
			});
		},
		addStopWord: async function () {
			if (event) {
				event.preventDefault()
			}
			const searchParams = {};
			console.log(this.searchDate);
			console.log(this.client);
			console.log(this.desc);
			if (this.desc) { searchParams.desc = this.desc }
			else if (this.customer) { searchParams.client = this.customer }
			else { searchParams.date = this.date.split('-').reverse().join('.') }

			const stopWords = getSelection().toString();
			console.log(stopWords);
			if (stopWords.length != 0) {
				let response = await fetch('/stopwords', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify([stopWords])
				});

				let result = await response.text();
				alert(result);
				fetch(host + ':' + port + '/search?' + new URLSearchParams(searchParams).toString(), {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				}).then(async res => {
					let result = JSON.parse(await res.text());
					if (result.items) {
						this.items = result.items
						this.message = null;
					};
					if (result.message) {
						this.items = null;
						this.message = result.message;
					};
				}).catch(error => {
					this.isError = true;
					this.status = 'Нет ответа сервера';
					console.error(this.lastUpdateTime + ' ' + this.status + ' ' + error.message);
				});
			} else {
				alert('Не выделено слово для добавления в список стоп-слов');
			}
		},
	}
});