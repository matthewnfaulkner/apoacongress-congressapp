<script setup lang="ts">
import type { Organisation } from '#shared/types/schema';
import PeopleCommittee from './PeopleCommittee.vue';
type CommitteeMember = {
    id: string;
    persons_id: {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        title?: string | null;
        qualifications?: string[] | null;
        image?: any;
        country?: any;
        bio?: string | null;
    };
};

type CommitteePosition = {
    id: string;
    title?: string | null;
    members: CommitteeMember[];
};

type ExpandedCommittee = {
    id: string;
    title?: string | null;
    slug?: string | null;
    congress?: string | null;
    positions: CommitteePosition[];
};

type ExpandedOrganisation = Organisation & {
    apoa_section_details?: Array<{
        id: string;
        committees?: Array<{
            id: string;
            committee?: ExpandedCommittee;
        }> | null;
    }> | null;
};

const props = defineProps<{ organisation: ExpandedOrganisation }>();

const committees = computed(() =>
    (props.organisation.apoa_section_details ?? [])
        .flatMap((s) => s.committees ?? [])
        .map((c) => c.committee)
        .filter(Boolean) as ExpandedCommittee[],
);
</script>

<template>
    <div v-if="organisation.type === 'apoa_sections' && committees.length" class="space-y-8">
        <div v-for="committee in committees">
            <Headline :headline="committee.title" />
            <PeopleCommittee
                :key="committee.id"
                display="grid"
                :show-title="false"
                :show-flag="true"
                :show-country="false"
                :data="committee"
            />
        </div>

    </div>
</template>
