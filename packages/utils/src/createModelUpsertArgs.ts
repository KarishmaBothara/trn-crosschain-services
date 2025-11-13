export function createModelUpsertArgs<
	R,
	A extends { where: unknown; create: unknown; update: unknown }
>(
	where: A["where"],
	data: Partial<Omit<R, "id" | "createdAt" | "updatedAt">>
): A {
	return {
		where,
		create: {
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		update: {
			...data,
			updatedAt: new Date(),
		},
	} as A;
}
