<script setup lang="ts" >

interface ProfileImageProps {
	image: string,
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
background-image: url('/images/taipei-bg.jpg');
background-size: contain;
}
</style>