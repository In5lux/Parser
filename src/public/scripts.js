// const date = d => `${d.getFullYear()}-${d.getMonth().toString().length == 1 ? ('0' + (d.getMonth() + 1)) : d.getMonth()}-${d.getDate()}`;

//console.log(date(new Date()));

const host = 'http://localhost';
const port = 3333;


var app = new Vue({
	el: '#app',
	data: {
		date: localStorage.getItem('date') || null,
		customer: null,
		desc: null,
		lastUpdateTime: localStorage.getItem('lastUpdateTime') || null,
		status: null,
		isError: false,
	},
	methods: {
		parse: function () {
			if (event) {
				event.preventDefault()
			}
			fetch(host + ':' + port + '/parse').then(async res => {
				const response = await res.text();
				this.isError = false;
				this.status = response;
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
			window.open(host + ':' + port + `/db?date=${date}`, "_self");
		}
	}
})