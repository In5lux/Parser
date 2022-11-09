export const isNew = (db, number) => {
	for (const dbItem of db) {
		if (dbItem.number == number) return false;
	}
	return true;
};