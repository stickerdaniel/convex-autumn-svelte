export async function flushPromises(times = 3) {
	for (let index = 0; index < times; index += 1) {
		await Promise.resolve();
	}
}
