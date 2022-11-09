export const txtFilterByStopWords = (text) => {
	const stopWords = [
		'ремонт',
		'уборке',
		'автомобильных',
		'шин',
		'медицинской',
		'движения',
		'уборке',
		'санитарному'
	];
	for (const word of stopWords) {
		if (text.indexOf(word) != -1) return false;
	}
	return true;
};