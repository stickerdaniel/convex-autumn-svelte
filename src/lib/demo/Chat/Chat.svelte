<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import Message from './Message.svelte';
	import MessageList from './MessageList.svelte';
	import { useCustomer } from '$lib/sveltekit';

	interface Props {
		viewerId: Id<'users'>;
		initialMessages?: {
			author: string;
			_id: Id<'messages'>;
			_creationTime: number;
			userId: Id<'users'>;
			body: string;
		}[];
	}

	let { viewerId, initialMessages }: Props = $props();

	const client = useConvexClient();
	const { refetch } = useCustomer();

	let newMessageText = $state('');

	const messages = useQuery(api.messages.list, {}, () => ({ initialData: initialMessages }));

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (newMessageText.trim() === '') return;

		try {
			await client.action(api.messages.send, { body: newMessageText });
			newMessageText = '';
			await refetch();
		} catch (error) {
			console.error('Failed to send message:', error);
		}
	}
</script>

<MessageList messages={messages.data}>
	{#if messages.data}
		{#each messages.data as message}
			<Message authorName={message.author} authorId={message.userId} {viewerId}>
				{message.body}
			</Message>
		{/each}
	{/if}
</MessageList>

<div class="border-t border-surface-200-800">
	<form onsubmit={handleSubmit} class="flex gap-2 p-4">
		<input type="text" bind:value={newMessageText} placeholder="Write a message…" class="input" />
		<button type="submit" disabled={newMessageText === ''} class="btn preset-filled-primary-500">
			Send
		</button>
	</form>
</div>
