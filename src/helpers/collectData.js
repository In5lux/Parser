export const collectData = async (page, url) => {
	try {
		await page.goto(url, { waitUntil: 'networkidle2' });
		await page.waitForTimeout(3000);
		return await page.content();
	} catch (err) {
		console.error(err.message);
		return false;
	}
};