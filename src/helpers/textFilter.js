export const txtFilterByStopWords = (data) => {
	const stopWords = [
		'ремонт',
		'уборк',
		'автомобильн',
		'шин',
		'медицинск',
		'движен',
		'санитарн',
		'стирк',
		'глажен',
		'проектн',
		'бензин',
		'собак',
		'корм',
		'химчистк',
		'инвестиц',
		'цветочн',
		'очистк',
		'изготовлен',
		'охран',
		'топлив',
		'печать',
		'мебели',
		'строительств',
		'установк',
		'погрузк',
		'доставк',
		'мойк',
		'беспилотн',
		'груз',
		'картрид'
	];
	if (typeof data == 'string') {
		const text = data.toLowerCase();
		//console.log(text);
		for (const word of stopWords) {
			if (text.indexOf(word) != -1) return false;
		}
	} else if (typeof data != 'string') {
		return false;
	}
	return true;
};