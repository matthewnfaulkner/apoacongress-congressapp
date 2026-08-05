<script setup lang="ts" >

interface ProfileImageProps {
	image: DirectusFile | string | null | undefined,
}

const props = defineProps<ProfileImageProps>();

</script>
<template>

    <DirectusImage
        class="rounded-edge"
        :uuid="image"
        ><slot />
    </DirectusImage>
</template>

<style>
.rounded-edge {
background-image: url('/images/taipei-bg.png');
background-size: contain;
}
</style>