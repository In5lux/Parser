// const date = d => `${d.getFullYear()}-${d.getMonth().toString().length == 1 ? ('0' + (d.getMonth() + 1)) : d.getMonth()}-${d.getDate()}`;

//console.log(date(new Date()));

const host = 'http://localhost';
const port = 3333;

var socket = io.connect();

socket.on('add mess', function (data) { })

var app = new Vue({
	el: '#app',
	data: {
		date: localStorage.getItem('date') || null,
		searchDate: localStorage.getItem('searchDate') || null,
		customer: null,
		price: null,
		desc: null,
		lastUpdateTime: localStorage.getItem('lastUpdateTime') || null,
		status: null,
		isError: false,
	},
	methods: {
		parse: function () {
			if (event) {
				event.preventDefault()
			};
			this.isError = false;
			socket.emit('send mess', 'Start parsing');
			socket.on('add mess', async function (data) {
				console.log(data);
				const d = await data;
				app.status = d;
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
		search: function () {
			this.isError = false;
			if (event) {
				event.preventDefault()
			}
			if (this.desc) {
				window.open(host + ':' + port + `/db?desc=${this.desc}`, "_self");
				localStorage.removeItem('date');
			};
			if (this.customer) {
				window.open(host + ':' + port + `/db?client=${this.customer}`, "_self");
				localStorage.removeItem('date');
			};
		},
		dateChange: function handler() {
			this.isError = false;
			const value = event.target.value;
			localStorage.setItem('date', value);
			const date = event.target.value.split('-').reverse().join('.');
			this.searchDate = date;
			localStorage.setItem('searchDate', date);
			window.open(host + ':' + port + `/db?date=${date}`, "_self");
		},
		addStopWord: async function () {
			if (event) {
				event.preventDefault()
			}
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
				location.reload();
			} else {
				alert('Не выделено слово для добавления в список стоп-слов');
			}
		},
	}
});

