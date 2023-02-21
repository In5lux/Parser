const dateFormat = d => `${d.getFullYear()}-${d.getMonth().toString().length == 1 ? ('0' + (d.getMonth() + 1)) : d.getMonth()}-${d.getDate().toString().length == 1 ? ('0' + (d.getDate())) : d.getDate()}`;

const host = 'http://localhost';
const port = 3333;

var socket = io.connect();

socket.on('add mess', function (data) { });

Vue.component('informer', {
	props: ['informer_msg'],
	template: `<div class="informer-background">
	<div class="stop-word-informer">{{ informer_msg }}</div>
	</div>
	`
});

Vue.component('stopwords-editor', {
	props: ['stopwords_list', 'stop_word_delete'],
	template: `<div class="stopwords-editor-background">
	<div class="stop-words-editor">
			<span class="word" v-for="(word, index) in stopwords_list" :id="index" :key="index" v-on:click.alt.exact="stop_word_delete">{{word}}</span>
		</div>
	</div>`
});

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
		executor: null,
		informer_msg: null,
		isActive: null,
		isStopwordsEditor: null,
		stopwords_list: null,
	},
	methods: {
		parse: function () {
			this.isError = false;
			socket.emit('send mess', 'Start parsing');
			socket.on('add mess', async function (data) {
				const d = await data;
				app.status = d;
			});
			socket.on('executor', async function (data) {
				const d = await JSON.parse(data);
				app.executor = `${d.name} ${d.index + 1}/${d.length}`;
			});
			const searchParams = {
				date: this.searchDate
			}
			if (this.customer) searchParams.client = this.customer;
			fetch(host + ':' + port + '/parse?' + new URLSearchParams(searchParams).toString())
				.then(async _res => {
					this.lastUpdateTime = new Date().toLocaleString();
					localStorage.setItem('lastUpdateTime', this.lastUpdateTime);
				}).catch(error => {
					this.isError = true;
					this.status = 'Нет ответа сервера';
					console.error(this.lastUpdateTime + ' ' + this.status + ' ' + error.message);
				});
		},
		search: async function () {
			this.isError = false;
			const searchParams = {};

			document.querySelector('.start-msg')?.remove();

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
		},
		dateChange: function handler() {
			this.isError = false;
			this.desc = null;
			this.customer = null;
			document.querySelector('.start-msg')?.remove();
			const value = event.target.value;
			this.date = value;
			localStorage.setItem('date', value);
			const date = event.target.value.split('-').reverse().join('.');
			this.searchDate = date;
			localStorage.setItem('searchDate', date);

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
			const searchParams = {};
			if (this.desc) { searchParams.desc = this.desc }
			else if (this.customer) { searchParams.client = this.customer }
			else { searchParams.date = this.date.split('-').reverse().join('.') }

			const stopWords = getSelection().toString().trim();
			if (stopWords.length != 0) {
				let response = await fetch('/stopwords', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify([stopWords])
				});

				let result = (await response.text()).replace(/\'/g, '"');
				app.informer_msg = result;
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
					document.querySelector('.start-msg')?.remove();
				}).catch(error => {
					this.isError = true;
					this.status = 'Нет ответа сервера';
					console.error(this.lastUpdateTime + ' ' + this.status + ' ' + error.message);
				});
			} else {
				app.informer_msg = 'Не выделено слово для добавления в список стоп-слов';
			}
			this.isActive = true;
		},
		stopWordEditor: function handler() {
			fetch(host + ':' + port + '/stopwords', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(async res => {
				let result = JSON.parse(await res.text());
				app.stopwords_list = result;
			});
			this.isStopwordsEditor = true;
		},
		stop_word_delete: function () {
			const id = event.target.id;
			fetch(host + ':' + port + '/stopwords', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify([id])
			}).then(async res => {
				let result = JSON.parse(await res.text());
				app.stopwords_list = result;
			});
		},
		sendMail: async function () {
			const id = event.target.id;
			fetch(host + ':' + port + '/mail', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify([id])
			}).then(async res => {
				let result = await res.text();
				app.informer_msg = result;
				console.log(app.informer_msg);
				this.isActive = true;
			})
		}
	}
});

const body = document.querySelector('body');

body.addEventListener('click', () => {
	if (body.scrollHeight !== window.innerHeight && app.isActive || app.isStopwordsEditor) {
		body.classList.add('hide_scroll')
	} else {
		body.classList.remove('hide_scroll')
	}
});